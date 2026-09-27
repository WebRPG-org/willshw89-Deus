# DEUS Water Dynamics

Cross-layer water on the existing 0..7 solver. Cell depth stays in `UF.Fluid` (`game/js/plugins/DEUS_Fluid.js`). Transfers that are not open-shaft gravity live in `game/js/sim/hydro/`. This file is the note for that path. `docs/systems/DEUS_Fluid.md` is unchanged.

If `require("../sim/hydro/index.js")` throws, `UF.Fluid.hydro()` is null and the 0..7 solver runs as it did before this lane. The attach regression loads the plugin with a `require` that throws; that path does not create these stores.

## Counted water

Water is an integer depth unit (du), the same unit as cell depth (`DEPTH_MAX` 7). Lava is not part of this ledger.

| Store | Where it sits | What moves it |
|---|---|---|
| Cell depth | The sparse fluid grid, type water | Gravity, lateral equalisation, the transfers below |
| Aquifer | A named store, or `col:ax:ay:x:y` for a column | Springs draw it. Seepage into a blocked porous column credits it |
| Atmosphere | One integer on the hydro session | Evaporation credits it. Precipitation debits it |
| Displaced | One integer on the hydro session | `reconcileCellWithStrata` puts leftover du here when a cell's capacity shrinks and the neighbours and the cell above cannot take it |

`diagnostics().totalWaterVolume` is still the water on the grids only. `diagnostics().totalWaterMass` adds the three stores. `hydro().mass()` returns `{ grid, aquifers, atmosphere, displaced, total }`.

A transfer that does not fit stays in the store it came from. A source does not invent du. A sink does not throw du away. Defining an aquifer or seeding the atmosphere is placement of water that is already counted, the same kind of act as `setCell`.

## Seepage

`UF.Levels.dominantMaterial` names the cell. `createMaterials(...).material(id).porosity.perm` is the class, an integer 0..6. The catalogue fraction on that record is still null (`PLACEHOLDER`). This lane does not write the catalogue.

| Class | This lane's step | Catalogue examples used by the test |
|---|---|---|
| 0 | Blocked | granite |
| 1 | 1 du every 4th visit of that cell | |
| 2 | 1 du every 3rd visit | clay |
| 3 | 1 du every 2nd visit | soil, sandstone |
| 4 | 1 du every visit | sand |
| 5 | 2 du every visit | |
| 6 | Not seepage. An opening uses gravity | air |

The schedule is an integer map of the stored class so a higher class moves sooner. It is not a measured conductivity, and it is not a porosity fraction.

A seep starts at a wet water cell and walks down that column only. A capacity-0 cell with class 1..5 is a plug: water does not stay there. The walk stops at the first open cell and moves du into it, or, if the plugs reach the bottom of the range, into that column's aquifer. Class 0 or 6 on a plug stops the walk. One visit is one processing of the source cell. A settled cell on an impermeable floor is not queued again.

## Waterfalls

Unchanged gravity. The source cell's passage `DOWN` bit (8) and an open cell below move as much depth as fits, one step along the column each time the cell is processed. A multi-level drop is that step repeated. The cell at the bottom of a basin has no `DOWN` bit, so the water stops. This is not seepage: an open cell under the source is not a plug.

## Springs

`hydro().defineAquifer(id, stored)` sets that store. `hydro().defineSpring({ ax, ay, x, y, z, aquifer, rate })` marks an outlet. Each hydro tick draws `min(rate, stored, room)` from that aquifer into the outlet, then spills if the outlet is over capacity (see Flooding). At stored 0 the outlet is not queued again. Water the outlet cannot accept goes back to the aquifer.

## Lakes

A lake is a list of cells, not a scan of the map.

- `setSeasonInput(fn)` — `fn({ tick })` returns `{ precipitation: <non-negative integer> }`, du offered to each registered cell that tick. The default returns 0. The function is not saved. After load the offer is 0 until the host sets it again.
- `seedAtmosphere(n)` — the precipitation debit. An empty atmosphere yields no rain.
- `defineLake({ id, evap, cells })` — `evap` is du per hydro tick moved from a wet cell into the atmosphere.
- Infiltration is the seep above. A porous column under the lake sends du into the column aquifer.

Du the cell and its spill targets cannot hold is returned to the atmosphere.

The tick counter passed to `fn` is not a calendar. DEC-026 (solar day against the year) is open. This lane does not choose an option. A caller may pass any pure function of the tick. The suite's wet and dry stretches are that kind of function.

## Flooding

Delivery into a cell fills it up to its capacity, then the four orthogonal neighbours, then the cell above when this cell's passage `UP` bit (16) is set and the cell above has room. A cell with capacity 0 is not written. Du that still does not fit stays in the aquifer or the atmosphere it was drawn from.

## Change-driven cost and sparse storage

A tick runs lake precipitation and evaporation first (only registered cells that have an offer or evaporation this tick, up to the solver budget, default 512), then the dirty queue. A quiet queue and a zero offer examine no cells. Column walks happen only for a wet cell that is already queued, and only down that column, bounded by the layer count.

Level grids are still created on the first write of fluid to that level (WG.00.17). Reading every level allocates none. Aquifers, springs, and lakes are maps of the stores and outlets that exist, not a 32-layer array.

On a 32-layer fixture, map 32×32, one open column, one tick's queue stays far below `32 × 32 × 32` cells. The next tick after the water has pooled processes 0. The numbers are the `COST-32` line from `node tools/sim/test_water_dynamics.js`.

`UF.Fluid.tick` still steps the viewed area when `UF.World.viewLevel()` is set, and the hydro tick for that frame uses the same area. With no view, every area that already has fluid is stepped, and every registered lake is eligible. That is the same view rule the solver already had.

## Save and load

`makeSaveContents` keeps `fluidSchemaVersion: 1` and the record list `[ax, ay, z, x, y, type, depth]`. A save with no aquifer, spring, lake, atmosphere, or displaced water has no `hydro` key. A save that has any of those adds:

```json
{ "v": 1, "atmosphere": 0, "displaced": 0, "aquifers": [["karst", 4]], "springs": [], "lakes": [] }
```

`extractSaveContents` accepts a bare record array, a version-1 object with no `hydro` key, and a version-1 object with that key. Old saves load. The season function is not in the save. A non-zero seep visit count is stored as `hydro.visits` so a slow class resumes on the same beat of its period; a save from before this lane has no visits and starts at zero.

## API (`UF.Fluid.hydro()`)

| Method | Role |
|---|---|
| `defineAquifer(id, stored)` | Set a counted store |
| `defineSpring({ ax, ay, x, y, z, aquifer, rate })` | Outlet. `rate` defaults to 1 |
| `defineLake({ id, evap, cells })` | Cells that may take precipitation and evaporate |
| `setEvap(id, n)` | Change a lake's evaporation |
| `setSeasonInput(fn)` | Precipitation offer. Default is 0 |
| `seedAtmosphere(n)` | Set the atmosphere store |
| `mass()` | Grid plus the three stores |
| `cost()` | `{ examined, processed, tick, aquifers, springs, lakes }` for the tick just run |
| `storedAt(id)` | One aquifer |
| `columnId(ax, ay, x, y)` | Id of the implicit column aquifer |
| `configure(flags)` | Test mutants only. Cleared by `UF.Fluid.reset()` |

`configure` flags, all default false: `createWater` (a spring does not debit its aquifer), `deleteEvap` (evaporation does not credit the atmosphere), `floodSolid` (delivery writes a capacity-0 cell), `fullScan` (the tick walks every cell of every layer), `ignorePerm` (class 0 is treated as class 3).

## Tests

`node tools/sim/test_water_dynamics.js`. Fixture: `tools/sim/fixtures/water_dynamics/ranges.json`. Both `-16..+15` and `-4..+4`. The checks cover seepage (soil against granite, and sand against soil), a one-level opening, a drop across the whole range, a spring that stops, a lake that fills from the atmosphere and dries by evaporation, infiltration into a column aquifer, lateral flood, flood up through an open ceiling, refusal to write rock, lava left untouched, a capacity shrink whose leftover du is counted, old saves, a hydro round-trip, 200-tick mass checkpoints run twice, and the 32-layer cost bound. Each of those killed cases is a configure flag or the existing `_mutantNoGravity` flag, and the suite shows the matching check fail under that flag.

## Outside this lane

Surface rivers and lakes drawn as tiles, strata water, and passage flags on natural connections are still separate stores. Drinking and bucket fills do not debit this ledger. There is no pressure field and no U-bend solver; a spring delivers at its outlet. Off-view water still follows the viewed-area tick. Erosion is not modelled; this ledger has no velocity. The follow-ups are `PROPOSED-AU-NN` in `tasks/SIM.50.02/lane-au/REPORT.md`. They are not WBS ids.
