# DEUS Structural (`game/js/sim/structural/`)

Status: NAT.02.01 part 2 of 6 (lane-gq, pure connectivity), 2026-10-02.

## Pure connectivity (DEC-083)

**Model:** Connectivity-only support (like Minecraft). A block is held if there is a connected path of solid blocks (face neighbours only) to an anchor. An anchor is the world floor or a reader-certified anchor. Capacity, load, weight, HP bands, spans, and materials are ignored. When a component loses its path to an anchor, it falls as a rigid body straight down until it hits the first non-piece solid obstacle or the floor.

**Contract:**
- `DEFAULTS = { readsPerTick: 512, maxVisits: 65536, maxFallVoxels: 20000, maxActiveJobs: 4, maxCommitsPerTick: 1 }`
- `createHeldJob(reader, seed, opts)`
- `evaluateHeld(reader, seed, opts)`
- `wouldBeHeld(reader, addr, opts)`
- `createFallJob(reader, component, opts)`
- `planFall(reader, component, opts)`
- `createQueue()`
- `createService(reader, opts)`

**Result:** `verdict` is `"held"`, `"falls"` or `"not_solid"`; `reason` is `"floor"`, `"certified"`, `"unknown_edge"`, `"too_large"`, `"no_anchor"` or `"seed_not_solid"`; `anchor` `[x,y,g]` or null; `visited`; `component` (only for `falls`: exactly the connected solid component, sorted by g, y, x); `watch` (only for `unknown_edge`); `ops {read, visit}`.

**Checks:** `node tools/test_structural_connectivity.js` (presence, 28 named checks, mutants).

**Status:**
- **Works (headless, fixtures):** pure connectivity, iterative depth-first flood fill, rigid fall calculation, canonical queue and multi-job service.
- **Not checked:** in-engine translation, save/load, Levels geometry reader.

## Rooted support topology (lane-en)
**[superseded by DEC-083, code archived by nx3]**

An idealized mechanics topology using the rule *member on bearing*.

## Limits and Constraints
**[superseded by DEC-083, code archived by nx3]**


## Purpose

The structural subsystem decides whether matter is held up and what happens when it is not (merged design D3, 2026-09-30). This document covers the part that exists now: the **rooted support evaluator** (`rooted.js`) and the **StrataReader contract** it reads geometry through (`reader.js`).

A member is supported only through a certified path to a real foundation. A cluster of solids that only touch each other (a floating ring, a stack on a floating block) is unsupported, whatever flags were stored for it.

The evaluator is pure: it writes nothing, reads no fluid, computes no load, and never calls frozen `decay.breakElement`. Load and the integrity ladder (lane-eo), the planner (lane-ep), commit (lane-eq), the save codec (lane-fv), wet collapse (lane-fr, lane-fk) and the runtime bridge `game/js/plugins/DEUS_Structural.js` (NAT.02.01.BRIDGE lanes) are later parts. They add their own sections to this document, and the bridge lanes add the runtime section (there is no separate DEUS_Collapse doc).

The legacy `support.js::evalCellSupport` and `collapse.js::executeCollapse` are still exported unchanged. They are the stub that NAT.02.01 replaces (later parts). New code must not use them for support decisions.

## Model
**[superseded by DEC-083, code archived by nx3]**

- **Address.** World coordinates `(x, y, z, s)`, with stratum `s` 0..4 (S0 at the bottom). The global stratum index is `g = 5 × (z + 16) + s` (merged D3 §3.2). In `g`, S4 of layer z and S0 of layer z+1 are adjacent.
- **Occupied geometry.** A voxel reports the span it actually occupies, `lo..hi` in `reader.subunits` (the fixture uses 24, so 1 subunit = 1 inch of a 2 ft stratum). Partial deposits are real geometry:
  - **Vertical contact** needs the lower voxel to reach its top face (`hi = subunits`) and the upper voxel to start at its bottom face (`lo = 0`).
  - **Lateral contact** needs the two members' occupied extents to overlap by more than zero subunits.
- **Member** (SIM.40.01 §4.1, §4.6). A maximal vertical run of load-bearing voxels (class `natural` or `assembly`) in one column, joined by vertical contact. It crosses layer boundaries. Its key is `"x,y,g0"`. A voxel with hp 0 is destroyed and is not part of any member.
- **Loose** voxels are never members. A loose stack in full contact carries a member resting on it down to whatever the stack rests on.
- **Fluid** voxels are read as no solid geometry. This lane reads no fluid; wet collapse is lane-fk/lane-fr work.
- **Span** (SIM.40.01 §4.3-4.4):
  - The member's governing material is the one with the largest `spanBase[t_m]`, where `t_m = floor(subunits of m / reader.subunits)`. Ties go to the larger `ratedLoadKg`, then the lower key.
  - `spanBase` columns are for thicknesses t = 1, 2, 3, 5, 10, 20, ≥40 strata. A thickness uses the largest column not above it, and t < 1 spans nothing.
  - `band = (hp + 31) >> 5` (1..8), taken as the lowest band among the governing material's voxels.
  - `spanEff = floor(spanBase × band / 8)`.
  - Every `spanBase` entry must be 0..`S_MAX` (12).
- **Support rule** (merged D3 §3.2). The value `dist` is the least distance over certified paths:
  - **foundation** (dist 0): the member's bottom face bears on a certified foundation (`reader.foundation` is true).
  - **vertical** (dist carried unchanged): the member's bottom rests, through a loose stack in full contact, on a supported member B. Then `dist = dist(B)`.
  - **lateral**: a cardinal (N, E, S, W) neighbour member that overlaps it is supported at `d`, and `d + 1 ≤ spanEff` of this member. Distance is carried to the vertically bearing anchor and is never reset at each member.
  - A member is supported when some path exists. Because every value is a least distance from the foundations, cycles cannot lend support.
- **Unknown is pending** (merged D3 §3.2). Pending terrain is never treated as air or as support:
  - an unavailable voxel or foundation answer is pending;
  - a member whose own extent reaches unknown terrain is pending;
  - if no certified path was found and any unknown terrain was met, the verdict is `pending`.
  - A certified path found through known terrain stays `supported`.
  - The playable lower bound is not bedrock unless the reader certifies it.
- **Bounded search.** Phase A collects only the members that can lie on a valid path. A lateral departure from X leaves `min(allowance, spanEff(X)) − 1` hops for the rest of the path, so the region is at most S_MAX hops wide and holds every valid path exactly. Phase B is a bucketed least-distance pass over that region. No full-world scan happens. A column taller than 160 strata is reported as a reader fault (it throws).
- **Witness.** Each member keeps the predecessor that first gave it its final distance. The witness path follows those predecessors to the foundation, so it is acyclic and deterministic. Processing order: foundations in discovery order, vertical before lateral, neighbours in discovery order N, E, S, W.
- **One structural counter (Bs).** Every operation charges the caller's counter before it touches the reader. The counter kinds:
  - **member**: each voxel read or foundation query while walking a member's extent, and each search-queue visit.
  - **bearing**: each foundation query and voxel read under a member, each vertical relaxation, and each vertical witness step.
  - **lateral**: each neighbour-column read, each lateral relaxation, and each lateral witness step.

  When the counter refuses a charge, the job stops at that point and keeps its cursor. Merged D3 sets Bs = 512 initially as a versioned tuning value. Its home is the calibration file `game/data/sim/structural_calibration.json`, which is not owned by this lane. This module takes the limit from its caller.

## Public API

`require("game/js/sim/structural/index.js")` exports these, besides the legacy `evalCellSupport`, `executeCollapse` and `CELL_VOLUME_CUFT`:

| Export | Contract |
|---|---|
| `evaluateMember(reader, at, opts?)` | Evaluates the member holding the load-bearing voxel `at = {x, y, z, s}`. With `opts.counter`, charges that counter. If the counter runs out it returns `{verdict: "pending", reason: "budget", job, ops}`, and the caller continues with `job.step(counter)` on a later tick. Without a counter the evaluation is unbounded. Throws on a missing or non-integer coordinate, `s` outside 0..4, an air or loose voxel at `at`, a malformed reader, or missing material/geometry data. |
| `createRootedJob(reader, at)` | A resumable evaluation. `job.step(counter)` returns `job.done`. `job.result` holds the result once done. `job.ops` is the cumulative `{member, bearing, lateral, total}`. A job is valid only for the geometry it read: a caller that lets the world change between steps must discard it. Revision checks belong to S-CORE's scheduler, a later part. |
| `createOpsCounter(limit)` | The structural counter. `limit` is a non-negative integer or `Infinity`. It exposes `charge(kind) → boolean` (refuses at the limit; an unknown kind throws), `used`, `remaining`, `limit` and `byKind`. Share one counter across all structural work in a tick. |
| `bandOf(hp)` | `(hp + 31) >> 5` for an integer hp 1..255. Throws otherwise. |
| `spanBaseFor(material, t)` | The `spanBase` column for thickness `t` strata. Returns 0 below t = 1. |
| `spanEffOf(spanBase, band)` | `floor(spanBase × band / 8)`. |
| `S_MAX`, `SPAN_THICKNESS` | 12; `[1, 2, 3, 5, 10, 20, 40]`. |
| `createFixtureReader(spec)` | A pure, bounded fixture world (see below). |
| `FIXTURE_MATERIALS` | Fixture catalogue: `granite` (spanBase 2,3,3,4,6,9,12; ratedLoadKg 77,880), `limestone` (1,2,3,3,5,7,11; 65,120), `rubble` (loose) and `water` (fluid), from SIM.40.01 §2.3. `legacy` holds the legacy predicate's inputs for the test adapter only. |
| `READER_PENDING` | The frozen `{pending: true}` answer. |
| `gOf(z, s)`, `zOfG(g)`, `sOfG(g)` | Address conversion. |

**Result** (frozen):

| Field | Meaning |
|---|---|
| `verdict` | `"supported"`, `"unsupported"` or `"pending"`. |
| `reason` | `null` when supported; `"no_root"` (no certified path within span); `"pending_terrain"`; `"budget"`. |
| `mode` | `"foundation"`, `"vertical"` or `"lateral"` when supported, otherwise `null`. |
| `dist` | The least certified distance, or `null`. |
| `rootDir` | The first witness step: `"F"`, `"D"`, `"N"`, `"E"`, `"S"` or `"W"`. |
| `anchor` | Key of the first member on the witness path with dist 0 (the vertically bearing anchor; the member itself in foundation/vertical mode). |
| `foundation` | Key of the member whose bottom bears on the foundation. |
| `path` | The witness path, `[{key, via}]` from the member to the foundation (`via` is the step direction; `"F"` ends it). |
| `member` | `{key, x, y, g0, g1, z0, s0, z1, s1, bottom, top}` (`bottom`/`top` in absolute subunits). |
| `span` | `{governing, thickness, spanBase, band, spanEff}` (`null` for a pending member). |
| `pendingAt` | Up to 8 unknown addresses met (diagnostics). |
| `ops` | This evaluation's charges by kind. |

**StrataReader contract** (`reader.js`; any reader, not only the fixture):

| Member | Contract |
|---|---|
| `subunits` | Positive integer: occupied-height resolution of one stratum. |
| `voxel(x, y, z, s)` | One of three answers. `{pending: true}` for unavailable terrain. `{material: null}` for air. `{material, lo, hi, hp}` with integer `0 ≤ lo < hi ≤ subunits` and `hp` 0..255; `hp` is required for load-bearing classes and optional for loose ones. Missing `lo`/`hi`/`hp` is an error, not a default. |
| `foundation(x, y, z, s)` | `true` when the voxel's bottom face bears on a certified foundation; `false` when it does not; `{pending: true}` when unknown. Any other answer is an error. |
| `material(key)` | `{class: "natural" \| "assembly" \| "loose" \| "fluid", spanBase: [7 integers 0..12] (natural/assembly), ratedLoadKg?}`. A missing record, class or `spanBase` is an error. |
| `canon(x, y)` | Optional: canonical `{x, y}` for wrapped worlds. |

Stored legacy flags on a voxel record (`supported`, `solid`) are never read by `rooted.js`.

**Fixture reader.** `createFixtureReader({bounds: {x0, y0, x1, y1}, zMin = -2, zMax = 2, subunits = 24, foundation: "floor" | false, materials})`:

- Columns outside `bounds` and voxels below `zMin` are pending. Above `zMax` is open sky (air).
- `"floor"` certifies the bottom face of `(zMin, s0)` in every in-bounds column.
- Writers (tests only): `set`, `setG`, `fillG`, `clearG`, `markPendingG` and `addFoundationG`. `set` defaults to a full voxel with hp 255 and stored flag `supported: true`, the legacy world state.

## Events

None. The evaluator is pure; committed-change events arrive with the bridge (NAT.02.01.BRIDGE).

## Save data

None. Verdicts are derived. A suspended job is an in-memory continuation; persisting structural continuation is the save codec's part (lane-fv, merged D3 §3.2 "Saving"). Restarting an evaluation from scratch after load gives the same result for the same geometry.

## Checks

`node tools/test_structural_rooted.js` (gate; also `--baseline`, `--legacy`, `--mutant=NAME`). The full run must show every check passing, the legacy predicate rejected and every mutant killed.

| Check | What it proves |
|---|---|
| `rooted_modules_present` | `rooted.js` and `reader.js` exist and `index.js` exports the rooted API (absence check: fails at the lane base). |
| `rooted_floating_ring_fails` | Rings of mutually adjacent members (t=1 and t=2) with no root are unsupported. With one wall, support reaches dist 1, 2 and 2 and does not travel round the cycle. |
| `rooted_bearing_needs_root` | A member on rubble on a floating block is unsupported. So is one above the empty half of a deposit. On a rooted pillar it is vertical (dist 0); on rubble on the foundation it is foundation; on rubble on a ledge it is vertical with the ledge's dist 1 carried. |
| `rooted_cross_z_member` | A column across a layer boundary is one member, evaluated the same from either end. A pillar through layers -2..0 is one foundation member. A two-voxel ledge across the boundary has thickness 2 and spanBase 3. |
| `rooted_rotation_invariant` | A cantilever shape in four rotations gives the expected verdict, dist and mode in each, and all rotations agree. |
| `rooted_distance_carried` | A granite ledge gives dist 1 and 2, with the witness path to the wall, and the third cell fails. A thin member at distance 3 beside a supported thick member fails, and a thick member beyond it cannot borrow through it. |
| `rooted_hp_band_span` | The `bandOf` table and its errors, and `spanEffOf`. A band-4 far cell fails at distance 2. A band-1 near cell fails, and so does the cell behind it. A band-4 near cell still carries the far cell. A destroyed voxel splits a pillar. |
| `rooted_unknown_is_pending` | Each of these is `pending`: a ledge beside unknown terrain; a block above or below unknown terrain; the lower bound without a foundation contract; an unknown starting voxel. A certified path beside unknown terrain stays supported. |
| `rooted_catalogue_span` | Granite and limestone `spanBase` columns. A granite ledge reaches 2 cells and a limestone ledge 1. Covers the governing-material choice and its tie-break, limestone t=10 (spanBase 5), and partial thickness rounding down. |
| `rooted_missing_data_errors` | Each of these throws: a missing or fractional coordinate, stratum 5, a material without `spanBase`, an air or loose start, a voxel without hp or lo/hi, a missing foundation answer, a reader without `subunits`. |
| `rooted_partial_geometry` | A deposit's empty half bears nothing. A gap under a voxel breaks contact. Lateral support needs overlap (edge contact fails, a 6-subunit overlap holds). Water bears nothing. |
| `rooted_ops_counted` | Exact counts, derived by hand from the algorithm: a single voxel on the foundation charges member 4, bearing 1, lateral 4; the 2-voxel wall + ledge case charges member 10, bearing 3, lateral 15. Every reader call follows its own charge. The caller's counter equals the job's ops and all kinds are charged. Budgets of 1, 2, 3, 7, 50, T−1 and T resume to the identical result in ceil(T/k) steps. An exhausted counter yields a resumable `budget` job. Two evaluations accumulate on one shared counter. |

Negative controls (run by the full gate):

- **Legacy predicate.** `support.js::evalCellSupport` runs unchanged through an adapter that feeds it the fixture's stored flags. It must turn `rooted_floating_ring_fails`, `rooted_bearing_needs_root` and `rooted_cross_z_member` red.
- **Source mutants of `rooted.js`.** Each mutant is a text edit compiled in memory, and each edit must match exactly once. Each must turn its named check red:

| Mutant | Defect | Check it turns red |
|---|---|---|
| `unknown_as_air` | Unknown read as air | `rooted_unknown_is_pending` |
| `reset_distance` | Lateral distance restarts at each member | `rooted_distance_carried` |
| `trust_flag` | A stored supported flag accepted as bearing | `rooted_bearing_needs_root` |
| `x_only` | Lateral search along x only | `rooted_rotation_invariant` |
| `unknown_as_support` | Unknown read as support | `rooted_unknown_is_pending` |
| `whole_cell` | Any occupied voxel read as full | `rooted_partial_geometry` |
| `z_local` | Members stop at layer boundaries | `rooted_cross_z_member` |
| `no_band` | HP band ignored | `rooted_hp_band_span` |
| `flat_span` | Thickness ignored | `rooted_catalogue_span` |
| `missing_defaults` | Missing `spanBase` defaulted | `rooted_missing_data_errors` |
| `uncharged_read` | Voxel reads not charged | `rooted_ops_counted` |
| `uncharged_relax` | Lateral relaxations not charged | `rooted_ops_counted` |

The legacy suite `tools/test_structural_collapse.js` still covers the unchanged legacy exports.

## Status

- **Works (headless, fixtures):** everything under Checks. Evidence: `tasks/NAT.02.01/lane-en/evidence/`.
- **Not built here:**
  - load, capacity, crush and the integrity ladder (lane-eo);
  - floating ice on water (SIM.40.01 §4.2 item 4; needs fluid, a wet lane);
  - objects and items as load;
  - dependency invalidation and the support queue (merged D3 §3.2 rule 4, later S-CORE parts);
  - a reader over live `DEUS_Levels` geometry (BRIDGE);
  - the calibration file holding Bs.
- **Known limits:**
  - **Conservative pending.** Any unknown terrain met during a search that finds no path makes the verdict `pending`, even where that terrain could not have helped.
  - **Witness rotation.** The witness's tie-break follows processing order, so `rootDir` is not rotation-invariant; `verdict`, `dist` and `mode` are.
  - **Unvalidated assumption.** Vertical edges carry the lower member's distance unchanged. SIM.40.01 §4.2 instead treats any member resting on a non-failing member as bearing (dist 0). The merged D3 rule requires a certified path, so this lane carries the distance. The reviewer should confirm this reading.
- **Not checked:** the in-engine package proof (`tools/test_package_proofs_ingame.js`, NW.js) was not run in this lane. It only uses the unchanged legacy exports, but `index.js` now also loads `rooted.js` and `reader.js` inside the engine.
