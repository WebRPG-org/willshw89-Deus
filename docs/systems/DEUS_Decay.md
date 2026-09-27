# Decay core

SIM.40.05, the host-agnostic part of the decay design (`tasks/SIM.40.05/lane-r/SIM.40.05_DECAY_CYCLE.md`). Parameter tables, the decay clock, and the instant-keyed scheduler. No plugin is wired. No strata are written. Nothing is drawn (DEC-007).

The calendar scale is not chosen. Callers pass `dpy` (game days per simulated year, D-1) only when an instant is drained. The clock formulas do not read it.

## Where it lives

| Path | Role |
|---|---|
| `game/data/sim/decay_params.json` | Classes, exposures, lives in milli-years, modifiers, stage points, residue fractions, transform names. |
| `game/data/sim/decay_params.schema.json` | Shape of that file. |
| `game/js/sim/decay/clock.js` | Integer clock: `lifeYt`, `rem`, `cross`, `failYt`, rebase. |
| `game/js/sim/decay/heap.js` | Min-heap ordered by `(dueYt, id)`. |
| `game/js/sim/decay/validate.js` | Dependency-free checks for the parameter file (AT-R-02). |
| `game/js/sim/decay/core.js` | Members, long and short heaps, sparse byte count, bookings. |
| `game/js/sim/decay/index.js` | The public surface. |
| `tools/sim/test_decay_core.js` | Headless tests. |

```
node tools/sim/test_decay_core.js
```

`createDecay(params, { dpy })` throws if `dpy` is omitted. A maintained member has no heap entry.

## Clock

`R` is 1,000,000. One simulated year is 2,400 year-ticks. A record stores `t0`, `rem0`, and `lifeYt`. Infinity is `0xFFFFFFFF` and is not scheduled.

```
lifeYt = ceil(lifeYears × 2400 × fieldNum × 512 / (fieldDen × ft8 × root8 × fire8))
rem(t) = max(0, rem0 − floor((t − t0) × R / lifeYt))
cross(p) = t0 + ceil((rem0 − p) × lifeYt / R)
failYt = cross(0)
HP = ceil(maxHP × rem / R)
```

Lives in the file are milli-years so that 0.05 sy is the integer 50. `lifeYears × 2400` is an integer when the milli-year is a multiple of 5. A finite `lifeYt` must be at most `2^32 − 2`. `(t − t0)` is clamped to `lifeYt` before the multiply, so the product stays inside a safe integer.

Catalog scale is `weatherResistance / 90` for ASHLAR and RUBBLESTONE, `rotResistance / 50` for TIMBER and LIGHTWOOD, and `corrosionResistance / 30` for FERROUS. CUPROUS, LEADTIN and SILVER stay at the table until the caller passes `fieldNum` and `fieldDen`. The design does not name those reference resistances.

Freeze-thaw is quantized up to the next eighth. Porous masonry (MUDBRICK, BRICK, RUBBLESTONE) uses `1 + 2 × FT`. ASHLAR uses `1 + 2 × FT × (1 − wR / 100)`. Other classes stay at 1. Layers at or below −1 use FT 0. Roots are ×2 on porous masonry and ×1.5 on ASHLAR. Charred TIMBER and LIGHTWOOD use ×1.5.

Rebase at instant `t1`, with `t0 ≤ t1` before failure: `rem0` becomes `rem(t1)`, `t0` becomes `t1`, `lifeYt` becomes the new life, and the heap entry is replaced. A `t1` before `t0` changes only `lifeYt`. A `t1` at or after failure is refused so the failure can be processed first. Damage takes `rem0 = min(rem(t1), floor(k × R / maxHP))`. Repair sets `rem0 = R`. Neither call creates mass.

FOUNDATION members stop at rem 250,000 (the anchor floor). They do not schedule rem 0.

## Scheduler

Two heaps, both keyed by `(dueYt, id)`. Kind sits in the top 3 bits of the id.

| Heap | Who | When an entry is due |
|---|---|---|
| Long | Members, corrosion, other lives of at least 1 sy | At a game-day boundary: `dueYt × dpy ≤ day × 2400`. At most `ceil(due / 2400)` entries that tick. |
| Short | Remains and FOOD, and any life under 1 sy | Every tick: `dueYt × dpy ≤ tick`. At most 16 entries. The rest wait. |

The stored instant stays `dueYt`. The day or tick on which it is drained can differ with `dpy`. `jumpTo(yt)` is the day-jump path: it pops in key order up to that instant and does not spread the batch across ticks. After a break, nothing later is popped until the break handler returns or the caller calls `releaseBarrier`. The handler is where a future runtime rebases the walls the failure exposed. This module does not discover exposure.

HP bytes are written only at the caller's thresholds (default three quarter-steps of `maxHP`) and at failure. That is at most `steps + 1` writes, with `steps` 4. A stage crossing at rem 850,000 books nothing.

## Mass

The core's own balance moves only by an equal transfer or a named sink. `commit` refuses a source. Shedding (`BUILT → FINES`), corrosion (`ITEM → OXIDE`) and rot (`floor` to soil, the remainder to AIR) are applied as those records. A break is not applied inside the core. The event carries `BUILT → RUBBLE` with cause `collapse.decay` and `call: "collapse.breakElement"`. The caller commits it. Sum of holdings, plus sinks, minus sources, stays equal to the mass that was opened.

`postLedger(ledger, record)` calls `ledger.transform` or `ledger.sink` when the record names a real ledger row. It refuses an ore, coal, gem or fossil output before the call. Design form names are not ledger class names. Mapping them is the caller's job.

`residueParts` and `rotSplit` are the integer splits from the tables. Ash plus charcoal plus gas equals the input. The burn function that would write a cell is not in this package.

## Memory

Byte counts use the design's typed sizes: 40 + 4 per run for a member, 12 for a heap entry, 20 for an item, 36 for remains, 32 for a structure. Residue is stored per touched chunk. A chunk with at most 64 entries counts 20 bytes each; past that it counts one 24 KiB plane. The layer count is not a term. `scenarioSite()` is 600 × 72 + 40 × 32 + 16 = 44,496 bytes. `scenarioL()` is the R-10.4 row: 20,000 events per sy is 9 per tick at `dpy` 1 and 1 per tick at `dpy` 20.

Save stores unmaintained clocks (`t0`, `rem0`, `lifeYt`, shed pool, runs) and the balance. It does not store the heaps. Load rebuilds them from the saved clocks and does not recompute `lifeYt` from the current modifiers.

## Left open

Owner questions are not decided here. The file ships the design's default and tags it `ownerOpen`.

| Id | Shipped default | What this package does |
|---|---|---|
| D-1 | unset | `dpy` is an argument. The parameter file stores null. |
| OQ-R-01 | (a) the life table | No speed factor. |
| OQ-R-03 | lithification off | The lithify row is disabled and outputs only ROCK-SED. It is not run. |
| OQ-R-04 | (a) unattended items weather | Carried and attended items get no decay record. |
| OQ-R-05 | (a) SPECIAL never decays | SPECIAL lives are infinite. |
| OQ-R-06 | (a) the sy remains table | Fresh to skeletal and skeletal to soil are data. Identity anchor years are 200. |
| OQ-R-07 | (a) exposed ash weathers | Weather lives are data. Burial is infinite. |
| OQ-R-09 | (a) decay ignores the damage threshold | A threshold passed by the caller does not stop the clock. Options (b) and (c) are not implemented. |

OQ-R-02 and OQ-R-08 are untouched. Foundations are not given a failure at rem 0; that is the design's anchor floor, not a ruling on how long a ruin must remain recognizable.

BONE has no SEALED or WET life in the design. Those two cells are gaps. `addMember` refuses them instead of inventing a rate.

Plugin wiring, Lane Q's real break path, the site state machine, fire residue writes, and the FX-R-01 long-run fixture are later packages. Follow-ups are listed in `tasks/SIM.40.05/lane-ay/REPORT.md`.
