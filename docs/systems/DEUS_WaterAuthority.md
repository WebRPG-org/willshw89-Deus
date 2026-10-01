# DEUS Water Authority

## Purpose and status

NAT.03.02 contract checkpoint, lane-ea, 2026-10-01. `game/js/sim/hydrology/index.js`
is the single entry point for fluid state (DESIGN-D2 section 3.2) and now exports
`createWaterAuthority`. At this checkpoint the authority holds the open-fluid store
in `game/js/sim/hydrology/open.js`: typed water and lava in integer centipounds
(cp, DEC-038), flowing by gravity and equalization under one work budget, across
wrapped area seams, entering only from finite registered sources (DEC-040), and
saved exactly.

The module is headless. It has no window, RMMZ or `UF` references, no randomness
and no clock. Nothing in the game calls it yet: binding it to `DEUS_Fluid`,
`DEUS_Levels` and the shared clock is lane-ec. This checkpoint does not change
gameplay, and no F5 behavior is claimed.

The aquifer exports of `index.js` (`Stratum`, `AquiferEngine`, `encodeStratumId`,
`decodeStratumId`, `canonicalEdgeKey`, `calcInterfaceConductivity`,
`MAX_WATER_MASS_PER_STRATUM`, `VOLUME_PER_STRATUM`,
`WATER_DENSITY_CENTIPOUNDS_PER_CUFT`) keep their names and re-export targets
(baseline recorded at 54d8e533). `aquifer.js` belongs to lane-ed.

## API

```js
const { createWaterAuthority } = require("./hydrology/index.js"); // from game/js/sim
const water = createWaterAuthority({ host, densities: { lava: lavaCpPerFt3 }, budget: 512 });
```

| Option | Meaning |
|---|---|
| `host.size` | Cells per area side |
| `host.areasX`, `host.areasY` | Area grid; every horizontal edge wraps (Emerys) |
| `host.zMin`, `host.zMax` | Z range |
| `host.openMask(ax, ay, x, y, z)` | 0..31: bit `s` set when stratum `s` (0 = bottom) of the cell is open to fluid (not solid, no closed wall or door) |
| `densities` | cp per cubic foot for each class other than water. Water's density always comes from `sim/units.js`; a host value for water that differs is refused (`E_CALIBRATION`). Lava has no built-in density: the host supplies it from material data. |
| `budget` | Work units per `step()`; default 512 |

| Method | Result |
|---|---|
| `registerGeologicalSources(manifest)` | Opens finite source accounts `[{ id, cls, cp }]` (or `{ sources: [...] }`). All or nothing; an id already registered is refused (`E_SOURCE_DUP`), so re-materializing a chunk cannot credit a source twice. Returns the registration records. |
| `release(sourceId, ref, cp, cause?)` | Moves up to `cp` from a source into the cell `ref = { ax, ay, x, y, z }`, bounded by the source's remainder and the cell's room. Returns the record, or `null` when nothing moved (source exhausted, cell full or solid, or the cell holds another fluid). An unknown source throws `E_NO_SOURCE`. This is the only way fluid enters the store. |
| `step(budget?)` | Runs queued visits. Returns `{ work, probes, records, queued }`. |
| `wake(ref)` | The host reports changed geometry at `ref`: queues it and its six neighbours if they hold fluid. |
| `fluidAt(ref)` | `null`, or `{ cls, cp, typeView, depthView, thicknessFt, surfaceFt }` |
| `depthView(ref)`, `typeView(ref)` | Derived views without a host probe |
| `capacityAt(ref, cls)` | cp the cell can hold of that class |
| `totals()` | `{ water: { open, sources }, lava: { ... } }`, running counters (no scan) |
| `sourceRemaining(id)`, `queued()` | Source remainder; queued visits |
| `serialize()`, `deserialize(data)` | See Persistence |

Errors are `Error` objects with a `code` (`E_HOST`, `E_REF`, `E_AMOUNT`, `E_CLASS`,
`E_CALIBRATION`, `E_MANIFEST`, `E_SOURCE_DUP`, `E_NO_SOURCE`, `E_BUDGET`, `E_SAVE`,
`E_SAVE_TOTALS`, `E_WORLD`, `E_MIX`).

### Transfer records

Every change is a record for the host, which books it in the ledger:

```js
{ row, cls, cp, cause, from, to, seam? }
```

`row` increases by one per record and is saved. `cause` is `register`, `release`
(or the caller's cause), `gravity` or `equalize`. `from` and `to` are cell keys
`"ax,ay,x,y,z"`, `src:<id>`, or `geology` for a registration. `seam` is present
when a move crosses an area seam: the two cell keys, lower first, joined by `|`.
It is the same whichever side was visited. A cell-to-cell move debits the donor
exactly what it credits the receiver.

## Storage and units

- Sparse per (area, z): `Map(area -> Map(z -> Map(cell -> { cls, cp })))`. A cell
  record exists only while it holds fluid. Empty levels and areas are dropped.
- A cell holds one class. Unlike fluids never share a cell, never overwrite one
  another and never equalize into one type. Water and lava that meet stay where
  they are (the reaction is NAT.03.05).
- Capacity of a cell for a class = open strata x `units.STRATUM_FT3` x the class's
  density. A full open cell holds `units.WATER_CP_PER_Z_CELL` (1,560,000 cp) of water.
  `open.js` and `index.js` hold no unit, density, gallon or depth-quantum literal;
  the test scans for them.

## Derived views

Fluid fills a cell's open strata from the bottom up.

- **thicknessFt** = cp / (cp per stratum) x `units.STRATUM_FT`: the liquid column.
- **surfaceFt**: the surface height above the cell floor. Half a stratum on a floor
  raised three strata stands at 7 ft and is 1 ft thick.
- **depthView** (0..7, `DEUS_Fluid`'s scale) = round(7 x thickness / 10 ft), at least
  1 when fluid is present. A full two-foot cavity reads 1 and a full ten-foot cell
  7. Equal volumes of water and lava read the same, though their cp differ. There is
  no fixed cp-per-depth quantum.
- **typeView**: the cell's class, so lava is never hidden behind water.

## Flow

`step()` serves one FIFO queue of cells across all areas. A visit is the
`DEUS_Fluid.stepArea` rule ported to cp:

1. **Gravity.** When the cell's bottom stratum is open and the top stratum of the
   cell below is open, everything that fits falls into the cell below, if that
   cell is empty or holds the same class. Nothing falls below `zMin`.
2. **Equalization** with each orthogonal neighbour (N, E, S, W), through the strata
   open in both cells. The visited cell only gives. It gives the most cp that
   leaves the neighbour's surface no higher than its own, keeps what lies below the
   lowest shared stratum, and fits the neighbour. It gives nothing when the two
   surfaces are within one millistratum (1/1000 of a stratum, the aquifer head
   unit). Surfaces are compared exactly in integers.

Every move leaves the receiver's surface no higher than the donor's, and fluid
only moves to lower or equal heights. A finite world therefore settles.

**Wake rules.** A move queues the receiver and the donor's fluid-holding
neighbours. A visited cell that moved fluid is queued again. A dry cell is never
queued: it cannot give.

**Wrapped seams.** Stepping off an area's edge enters the neighbouring area.
Stepping off the outer edge of the area grid enters the far side, east to west
and south to north. A seam is an ordinary interface, not an exit.

**Budget.** One counter per step: one unit per visit and one per host probe
(the cell's own mask, the cell below, each lateral neighbour). `work` and the
host's `openMask` calls never exceed the budget. A visit cut short keeps a
cursor (phase, own mask) and resumes on the next step. `wake` on that cell or a
neighbour restarts it. With nothing queued, a step costs nothing and probes
nothing, however much fluid stands still. `release`, `fluidAt` and `capacityAt`
are commands and queries, not tick work. They probe the host outside the budget.

## Persistence

`serialize()` returns plain JSON-safe data:
`{ schema: "deus.water.authority/1", open: { v, world, densities, row, sources, cells, queue, cursor, totals } }`.
Cells are in canonical order, and the queue keeps its order. `deserialize(data)`
replaces the state or throws and changes nothing. It refuses:

- another schema or version;
- another world size or range (`E_WORLD`);
- another density table (`E_CALIBRATION`);
- malformed cells, sources, queue entries or cursor;
- totals that differ from the saved accounts (`E_SAVE_TOTALS`), so a save cannot
  mint fluid.

Continuation is exact: `run(N)` equals `load(save(run(k)))` then `run(N - k)`, with
the same per-step work, probes, queue lengths and records. This holds even when a
save falls inside an unfinished visit.

## Known simplifications (this checkpoint)

- A cell is one compartment. Fluid fills its open strata from the bottom up, even
  when a solid stratum separates two open ones. With such a split cell, a little
  fluid may stay above the split rather than equalize.
- No contact record or reaction when water and lava meet (NAT.03.05). No
  groundwater exchange (lane-ed and later NAT.03 lanes). No rain or water return
  (NAT.03.03). No drains: nothing leaves through the bottom of the world.
- If geometry closes on stored fluid (an open mask shrinks), the fluid stays put.
  Displacement is the binding lane's job.
- One FIFO queue across areas. Fair multi-class scheduling and LOD are NAT.03.06.
- The 512 default is the settled checkpoint value, not a measured frame cost.

## Tests

`node tools/sim/test_water_open_cp.js` runs eleven named checks, then eleven source
mutants. Each mutant is loaded in a private module tree and must turn its named
check red by assertion. `--checks-only` and `--only <check>` are available.

| Check | Proves |
|---|---|
| `aquifer_exports_preserved` | The nine baseline exports are still `aquifer.js`'s, and an aquifer transfer through `index.js` keeps mass (guard; passes at the base too) |
| `cp_exact_conservation` | Open plus source cp per class equals registered cp after every step, read cell by cell and from the running totals |
| `cavity_height_depth` | Capacities from units; a 2-ft cavity reads depth 1, a 10-ft cell 7; surface on a raised floor; equal lava and water volumes read alike |
| `unlike_fluids_kept` | Water beside and above lava never enters it; lava keeps its cp and type |
| `wrap_seam_flow` | Outer east, internal, and outer south seams carry flow and equalize |
| `seam_once` | One seam record per crossing, canonical key, debit = credit, order-independent |
| `budget_bound` | Work and host probes are at most the budget for 1, 2, 3, 7, 64 and the default 512 |
| `no_source_no_mint` | Unknown source, re-registration, solid target, exhausted source and a tampered save all add 0 cp |
| `quiescent_zero` | A settled basin costs 0 work and 0 probes per step; settled neighbours are level within a millistratum |
| `no_unit_constants` | No unit literals; capacity follows `units.js`; lava's density only from the host |
| `serialize_roundtrip_exact` | Exact continuation from five save points, four inside a visit; a different density table is refused |

Mutants: `drop_cp`, `no_wrap`, `free_probe`, `depth_quantum`, `overwrite_type`
(brief), plus `seam_key_directional`, `mint_without_source`, `always_requeue`,
`density_literal`, `cursor_not_saved`, `export_dropped`.
