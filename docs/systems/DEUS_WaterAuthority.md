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

NAT.03.03 (lane-eb, 2026-10-01) adds water return in
`game/js/sim/hydrology/cycle.js`, composed by `index.js` when the authority is
created with a surface provider (see Water return). An authority created without
one is the checkpoint above, unchanged. Binding the provider to the open store is
lane-ec.

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
| `surface` | Optional (NAT.03.03): the sky-exposed water provider. With it the authority holds the water-return inventory (see Water return); without it, nothing about water return applies. |
| `waterReturn` | Optional overrides of `game/data/sim/hydrology.json` `waterReturn` (`delayTicks`, `rainCpPerVisit`, `evaporationPeriodTicks`, `evaporationCpPerReceiver`). Refused (`E_HOST`) without `surface`. |

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
| `credit(cp, cause, from)` | With a surface only. See Water return. |
| `returnStatus()` | With a surface only: `{ tick, total, ready, pending, nextDue, rain, evaporation, tuning }` |

Errors are `Error` objects with a `code` (`E_HOST`, `E_REF`, `E_AMOUNT`, `E_CLASS`,
`E_CALIBRATION`, `E_MANIFEST`, `E_SOURCE_DUP`, `E_NO_SOURCE`, `E_BUDGET`, `E_SAVE`,
`E_SAVE_TOTALS`, `E_WORLD`, `E_MIX`; water return adds `E_CAUSE` and `E_FROM`).

### Transfer records

Every change is a record for the host, which books it in the ledger:

```js
{ row, cls, cp, cause, from, to, seam? }
```

`row` increases by one per record and is saved. `cause` is `register`, `release`
(or the caller's cause), `gravity` or `equalize`; with water return also `exit`,
`steam`, `evaporation` and `rain`. `from` and `to` are cell keys
`"ax,ay,x,y,z"`, `src:<id>`, `geology` for a registration, `return` for the
return inventory, or the caller's account for a credit (`holding:<id>`, a contact).
With water return, open-flow and return records share one row sequence (the
authority's, saved in the return payload). `seam` is present
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

## Water return (NAT.03.03)

DESIGN-D2 3.2, "Quench and rain return"; DEC-040: all water that leaves comes back
as rain. `cycle.js` keeps one counted return inventory of water in cp. Tuning lives
in `game/data/sim/hydrology.json` (`waterReturn`, version 1), read on first use.

| Tuning | Value | Status |
|---|---|---|
| `delayTicks` | 100 | Settled (brief): a credit rains back no earlier than 100 ticks later |
| `rainCpPerVisit` | 1535 | PM_DEFAULT: the most one receiver visit delivers (about 3 mm over a 5 ft x 5 ft cell) |
| `evaporationPeriodTicks` | 2400 | PM_DEFAULT: an evaporation pass at most once per game day (36-s ticks) |
| `evaporationCpPerReceiver` | 1535 | PM_DEFAULT: the most a pass takes from one receiver (about 3 mm); 0 turns evaporation off |

The PM_DEFAULT values are flagged for the Owner (plan risk 19).

**Surface provider.** The cycle holds no cells. It reads, debits and credits
sky-exposed water only through the provider, and every call is charged to the
step budget:

| Method | Contract |
|---|---|
| `receivers(ax, ay)` | The area's sky-exposed receiving cells `[{ x, y, z }]`, in a stable order, from the provider's own index. Not changed during a step. |
| `room(ref)` | cp of water the receiver can take now |
| `credit(ref, cp)` | Puts up to `cp` of water on the receiver; returns the cp taken (0..cp) |
| `waterAt(ref)` | cp of sky-exposed water standing at the receiver (lava reads 0) |
| `debit(ref, cp)` | Takes up to `cp` of that water; returns the cp taken (0..cp) |

A value out of range throws `E_HOST`. lane-ec binds this provider to the open
store; this lane does not edit `open.js`.

**Credits.** `credit(cp, cause, from)` books water the caller has already debited
from `from` in the same transaction, and returns the record
`{ row, cls: "water", cp, cause, from: from.key, to: "return" }` (`null` for 0 cp).

| `cause` | `from` | Use |
|---|---|---|
| `exit` | `{ cls: "water", key: "<cell key>" }` | Open water leaving the simulation by a real exit (a drain, a bottom outlet). An area seam is not an exit. |
| `exit` | `{ cls: "water", key: "holding:<id>" }` | A typed water holding that cannot be placed |
| `steam` | `{ cls: "water", key: "<contact>" }` | Quench steam (NAT.03.05) |

A `from.cls` other than `water` throws `E_CLASS` and changes nothing: lava, and
a lava holding, never become return water. Another cause throws `E_CAUSE`; a
missing key `E_FROM`. Evaporation credits are the cycle's own (cause
`evaporation`, `from` the receiver's cell key).

**Due records.** A credit made at tick `t` (the number of steps completed) falls
due at `t + delayTicks`. Credits due on the same tick share one record. A record
that has come due moves into `ready`. The return inventory is `ready` plus every
due record: `totals().water.return`. With a surface, `open + sources + return`
plus the water standing on receivers is the closed water account.

**Rain.** While `ready` holds water, the rotation visits receivers area by area
(area order `ay` then `ax`, the provider's order within an area), continuing
from where it last stopped and wrapping from the last area to the first. A visit
probes `room`, offers `min(room, rainCpPerVisit, ready)`, and debits `ready` by
exactly what the receiver took, with a `rain` record `return -> <cell key>`. A
full receiver takes nothing and the water stays counted. Each receiver gets at
most one visit per step, so a world of full receivers costs one lap per step and
loses nothing. Rain does not prefer lakes: dry ground is a receiver like any other.

**Evaporation.** At most once per `evaporationPeriodTicks` (the first at that
tick), a pass visits every receiver once, reads `waterAt`, and debits up to
`evaporationCpPerReceiver` through `debit`, crediting the return inventory. A pass
runs under the budget and may span several steps; the next one starts a period
after the last one started, or the tick after it ended if that is later.

**Budget.** Open flow and water return share the step budget: open flow is served
first on even ticks, water return on odd ticks, and the second gets what is left.
Water return charges one unit per provider call: an area's receiver list (once per
area per step), each `room` or `waterAt` probe, and each `credit` or `debit`. A
rain or evaporation visit starts only with two units left, so water return needs a
budget of at least 3 to make progress. With no ready water and no pass due it
costs nothing. `step()` reports host and provider calls together in `probes`.

## Persistence

`serialize()` returns plain JSON-safe data:
`{ schema: "deus.water.authority/1", open: { v, world, densities, row, sources, cells, queue, cursor, totals } }`.
With a surface it adds
`cycle: { v, tuning, tick, row, ready, due, total, rain, evap }`: the tuning, the
tick, the authority's record row, the return inventory and its due records, the
rain cursor and the evaporation pass state. The provider's receiver index is not
saved; it is the host's.
Cells are in canonical order, and the queue keeps its order. `deserialize(data)`
replaces the state or throws and changes nothing. It refuses:

- another schema or version;
- another world size or range (`E_WORLD`);
- another density table (`E_CALIBRATION`);
- malformed cells, sources, queue entries or cursor;
- totals that differ from the saved accounts (`E_SAVE_TOTALS`), so a save cannot
  mint fluid;
- with a surface: a missing or malformed return payload (`E_SAVE`), a return total
  that differs from its due records (`E_SAVE_TOTALS`), and other tuning
  (`E_CALIBRATION`). The return payload is validated before the open store loads
  and committed after it, so a refused load changes nothing;
- without a surface: a save that holds a return payload (`E_SAVE`), so return water
  is never dropped by loading it into the checkpoint authority. This is the one
  input the checkpoint treats differently, and the checkpoint never wrote it.

Continuation is exact: `run(N)` equals `load(save(run(k)))` then `run(N - k)`, with
the same per-step work, probes, queue lengths and records. This holds even when a
save falls inside an unfinished visit, and, with a surface, inside an evaporation
pass or with return water due (given the same receiver state on the host side).

## Known simplifications (this checkpoint)

- A cell is one compartment. Fluid fills its open strata from the bottom up, even
  when a solid stratum separates two open ones. With such a split cell, a little
  fluid may stay above the split rather than equalize.
- No contact record or reaction when water and lava meet (NAT.03.05). No
  groundwater exchange (lane-ed and later NAT.03 lanes). No drains: nothing leaves
  through the bottom of the world. Water return exists (NAT.03.03), but nothing in
  the open store calls `credit` yet and the surface provider is not bound to the
  open store (lane-ec).
- Water return: rain is a fixed rotation, not climate (climate rainfall is out of
  scope). A receiver list that changes between steps may make the rotation or a
  pass skip or repeat a receiver once. The fair-service rule is an alternation of
  two work classes; fair multi-class scheduling and oldest-due reporting are
  NAT.03.06. Typed displaced water in the running game is still
  `DEUS_Fluid.pendingDisplaced`; routing it to `credit` is lane-ec.
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

`node tools/sim/test_water_cycle.js` (NAT.03.03) runs nine named checks, then nine
source mutants of `cycle.js` / `index.js`, with the same loader, options and
kill rule. Its surface provider is a test fixture.

| Check | Proves |
|---|---|
| `exit_rains_remote_nonlake` | Water from an outlet and a holding in area (0,0) rains on dry receivers in other areas, the far corner included; conserved every step |
| `full_receivers_retain` | 130 steps against full receivers keep every cp in the return inventory; room that opens takes exactly its room |
| `lava_never_returns` | Lava credits (holding, cell, steam) and an untyped one throw `E_CLASS` and change nothing; 400 steps of the cycle leave lava untouched |
| `evaporation_save_load_cycle` | Exact continuation of flow, evaporation, exits, steam and rain from six save points (three inside a pass); a tampered total and other tuning are refused |
| `rotation_deterministic` | Rain follows the rotation across areas, skips a full receiver, continues where it stopped and wraps; credit order within a tick and a second run change nothing |
| `due_not_early` | `hydrology.json` holds delay 100; rain comes first exactly 100 steps after a credit (and after an evaporation pass), 7 with a 7-tick override |
| `rain_charges_budget` | Work and host + provider calls stay within budgets 1, 2, 3, 7, 64 and 512, every call reported; rain progresses from budget 3 |
| `transfer_records_balance` | Replaying every record (open and return) reproduces every account; rows rise by one |
| `no_surface_is_base` | Without a surface: the checkpoint's members, steps, records, totals and save; an idle cycle takes no work or rows from open flow |

Mutants: `lakes_only`, `drop_on_full`, `lava_as_water`, `free_probe` (brief), plus
the provocations `rain_cursor_not_saved`, `cursor_reset`, `due_one_early`,
`evaporation_unrecorded` and `credit_without_surface`.
