# Independent Grok Review — NAT.02.01 / lane-en

| Field | Value |
|---|---|
| Role | Reviewer (independent closure, WORK-GATE G02) |
| Provider | Grok |
| Writer | claude |
| Lane | lane-en |
| WBS | NAT.02.01 part 1 of 6 (rooted support topology) |
| Branch | `task/lane-en` |
| Worktree | `C:\Users\snewt\.deus_worktrees\lane-en` |
| Reviewed commit | `03439030b1a593414e5751bc778137dd1ff1dd07` |
| Reviewed subject | `[claude] NAT.02.01 lane-en: evidence (base absence FAIL, legacy and named mutants red, fresh-clone gate PASS)` |
| Diff range | `b889de90..03439030` |
| Review date | 2026-10-01 |
| Binding | `tasks/NAT.02.01/lane-en/BRIEF.md`; WORK-GATE G02 section 2 row en; merged D3 §3.2 and §"Events, simulation time and bounded work" |

`git rev-parse HEAD` at review time was `03439030b1a593414e5751bc778137dd1ff1dd07`. Gates below were run in this worktree at that commit.

## 1. Scope

`git diff --name-status b889de90..03439030`:

```text
A	docs/systems/DEUS_Structural.md
M	game/js/sim/structural/index.js
A	game/js/sim/structural/reader.js
A	game/js/sim/structural/rooted.js
A	tasks/NAT.02.01/lane-en/EVIDENCE.md
A	tasks/NAT.02.01/lane-en/evidence/base_absence.txt
A	tasks/NAT.02.01/lane-en/evidence/base_test_structural_collapse.txt
A	tasks/NAT.02.01/lane-en/evidence/gate_fresh_clone.txt
A	tasks/NAT.02.01/lane-en/evidence/tip_check_deus_syntax.txt
A	tasks/NAT.02.01/lane-en/evidence/tip_full.txt
A	tasks/NAT.02.01/lane-en/evidence/tip_legacy.txt
A	tasks/NAT.02.01/lane-en/evidence/tip_mutant_reset_distance.txt
A	tasks/NAT.02.01/lane-en/evidence/tip_mutant_trust_flag.txt
A	tasks/NAT.02.01/lane-en/evidence/tip_mutant_unknown_as_air.txt
A	tasks/NAT.02.01/lane-en/evidence/tip_mutant_x_only.txt
A	tasks/NAT.02.01/lane-en/evidence/tip_test_structural_collapse.txt
A	tasks/NAT.02.01/lane-en/launches/20261001_024611_prompt.txt
A	tools/test_structural_rooted.js
```

Every path is inside `tasks/NAT.02.01/lane-en/lane.json` `allowedPaths`. `index.js` only adds rooted and reader exports; `evalCellSupport`, `executeCollapse` and `CELL_VOLUME_CUFT` stay. No `game/js/rmmz_*.js`, no plugin, no `game/data/*.json`, no image or art file.

## 2. Quality gates

Run by this reviewer, foreground, at the reviewed tip.

### `node tools/test_structural_rooted.js`

Exit 0.

```text
RESULT: PASS (12 checks; legacy and 12 mutants rejected)
```

Baseline, all green: `rooted_modules_present`, `rooted_floating_ring_fails`, `rooted_bearing_needs_root`, `rooted_cross_z_member`, `rooted_rotation_invariant`, `rooted_distance_carried`, `rooted_hp_band_span`, `rooted_unknown_is_pending`, `rooted_catalogue_span`, `rooted_missing_data_errors`, `rooted_partial_geometry`, `rooted_ops_counted`.

Legacy predicate (`support.js::evalCellSupport`, unchanged, through the fixture adapter) rejected on all three required checks. The floating ring is accepted by the legacy predicate (`got "supported", expected "unsupported"`), which is the defect this lane replaces.

Named mutants killed on their named checks:

| Mutant | Check turned red | Observed failure |
|---|---|---|
| `unknown_as_air` | `rooted_unknown_is_pending` | ledge beside unavailable terrain: `unsupported`, expected `pending` |
| `reset_distance` | `rooted_distance_carried` | ledge cell 2 dist: got 1, expected 2 |
| `trust_flag` | `rooted_bearing_needs_root` | rubble on a floating block: `supported`, expected `unsupported` |
| `x_only` | `rooted_rotation_invariant` | rotation 0 offset (0,-1): `unsupported`, expected `supported` |

The other eight source mutants (`unknown_as_support`, `whole_cell`, `z_local`, `no_band`, `flat_span`, `missing_defaults`, `uncharged_read`, `uncharged_relax`) also die on their named checks. Each edit matches the tip source once; a stale edit fails the harness. Production `rooted.js` has no mutant hook.

### `node tools/check_deus_syntax.js`

Exit 0.

```text
Checked 62 DEUS plugin files. Errors: 0
```

### Keep-green on the shared index

`node tools/test_structural_collapse.js` at this tip: 5/5 PASS, exit 0. Loading `rooted.js` and `reader.js` from `index.js` does not change the legacy collapse exports.

Not re-run here: the writer's fresh-clone log (`evidence/gate_fresh_clone.txt`) and the NW.js package proof. The package proof is outside this lane's gate list; `EVIDENCE.md` already marks it not checked. This review's gate evidence is the two commands above, executed in the worktree.

## 3. S-CORE invariants

### Actual occupied geometry

`reader.js` answers `{pending: true}`, `{material: null}` (air), or `{material, lo, hi, hp}`. There is no whole-cell SOLID flag on the contract. `rooted.js` `normaliseVoxel` requires integer `lo < hi` inside `reader.subunits` and refuses a missing span. Vertical contact requires the lower voxel to reach `hi === subunits` and the upper to start at `lo === 0`. Lateral contact requires a positive overlap of occupied extents (`min(top) > max(bottom)`), so an edge touch does not count. Fluid is not solid geometry. Stored `solid` / `supported` flags are never read; `trust_flag` has to patch that read in, and `rooted_bearing_needs_root` kills it. `whole_cell` (force `lo = 0`, `hi = subunits`) is killed by `rooted_partial_geometry` (deposit top 1728 vs 1692). Missing coordinates and missing material properties throw (`rooted_missing_data_errors`, `missing_defaults`).

Thickness for span is occupied height, `floor(subunits of m / reader.subunits)`, not a voxel count. That is the brief's occupied-geometry rule applied to partial deposits. `rooted_catalogue_span` locks 1.5 strata of granite as t = 1. SIM.40.01 §4.1's "number of voxels" would count a partial deposit as a full stratum; the brief wins where they differ.

### Unknown as pending

`raw.pending === true` becomes a pending voxel, and a pending foundation answer becomes `"pending"`. Neither path returns air or support. A member whose own column walk meets unknown terrain is pending. If the search finds no certified path and any unknown address was read, the verdict is `pending` / `pending_terrain`. A certified path through known terrain stays `supported` when a neighbour is unknown (`rooted_unknown_is_pending` case D). The playable lower bound is not bedrock unless `reader.foundation` certifies it. `unknown_as_air` and `unknown_as_support` both turn `rooted_unknown_is_pending` red.

### Single structural budget

One counter, `createOpsCounter`. Kinds are only `member`, `bearing` and `lateral`. Every voxel read and foundation query charges before the reader is called (`readVoxel`, `readFoundation`). Phase A charges each search-queue visit. Phase B charges each vertical and lateral relaxation. The witness charges each bearing or lateral step. A refused charge yields and `createRootedJob.step` keeps the cursor; `evaluateMember` returns `pending` / `budget` and the same job resumes on a later counter. `rooted_ops_counted` locks the hand counts (single foundation voxel 4/1/4, ledge 10/3/15), requires every spied `voxel` and `foundation` call to follow its own charge, and checks budgets 1, 2, 3, 7, 50, T−1 and T resume to the identical result. `uncharged_read` and `uncharged_relax` are killed.

Merged D3 sets the initial limit at Bs = 512 primitive operations per simulation tick, a versioned tuning value. `docs/systems/DEUS_Structural.md` states that and leaves the constant in `game/data/sim/structural_calibration.json`, which this lane does not own and does not edit. The module takes the limit from the caller so one shared counter can cover every structural visit in the tick. There is no second budget and no 32-step or 160-cell cutoff that drops work. A column taller than 160 strata (32 layers × 5, the whole stack) throws as a reader fault; a 160-stratum column is legal and is continued by the cursor, matching D3's "no terminal 160-cell cutoff".

`reader.canon`, when present, is address canonicalisation, not a geometry visit. `reader.material` runs inside a voxel normalisation that was already charged. Geometry reads are the charged visits.

### Support rule (doc asked the reviewer to confirm)

Merged D3 §3.2: a vertical contact counts only through a certified path to a real foundation; otherwise a cardinal path to a vertically bearing anchor, with distance measured to that anchor and not reset per neighbour; paths deterministic and cycle-free.

`rooted.js` follows that reading. Foundation contact is dist 0. A loose stack in full contact onto a supported member carries that member's distance unchanged (vertical cost 0). Lateral distance is `d + 1`, accepted only when `d + 1 <= spanEff` of the member being supported. Settle seeds only certified foundations, so a floating ring cannot support itself (`rooted_floating_ring_fails`). `rooted_bearing_needs_root` locks the carried distance: granite on rubble on a one-cell ledge is vertical at dist 1, not a new dist-0 anchor.

SIM.40.01 §4.2 would treat any rest on a non-failing member as bearing (dist 0). That mints a new anchor at every vertical rest and resets the span. The merged rule forbids the reset. The brief says the merge wins. The carried-distance reading is the one this lane should ship. `reset_distance` (allowance and candidate both restart) is killed by `rooted_distance_carried`.

Rotation uses N, E, S, W. `x_only` is killed by `rooted_rotation_invariant`. Members are global-stratum runs, so S4 of z and S0 of z+1 are one member; `z_local` is killed by `rooted_cross_z_member`.

Load, crush, planner, mass, fluid and the bridge are absent, as the brief requires. The verdict is topological support, not the later capacity check.

### Art (DEC-007)

The diff contains no image, sprite, or asset-request file. `DEUS_Structural.md` requests no art slot. No art was generated.

## 4. Verdict

The tip is inside the lane boundary. Both manifest gates pass on this worktree. Occupied geometry, unknown-as-pending, and the single Bs counter match the brief and merged D3, and the negative controls go red for the legacy predicate and for every named mutant.

VERDICT: CLEAN PASS
