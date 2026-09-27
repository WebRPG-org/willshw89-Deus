# Independent Review: SIM.40.05 (Lane AY)

- **Task ID:** SIM.40.05 (Decay core: parameter data + validator [PROPOSED-R-01] and host-agnostic decay clock + instant-keyed scheduler [PROPOSED-R-02])
- **Reviewed Writer Tip (FINAL SHA):** `2687aa1eea55a5442507d30141c155c340fb0f72`
- **Merge-Base:** `2755f61947610723723384ad39ad3fbc92d4679f` (origin/main)
- **Branch:** `task/lane-ay`
- **Writer:** grok (grok-4.7 xhigh)
- **Reviewer:** gemini (gemini-3.8-flash thinking HIGH per Owner DEC-034)

---

## 1. SHA and Git Verification

Git command output confirming tip:
```
git rev-parse HEAD origin/task/lane-ay
2687aa1eea55a5442507d30141c155c340fb0f72
2687aa1eea55a5442507d30141c155c340fb0f72

git log -12 --format="%H %an %s"
2687aa1eea55a5442507d30141c155c340fb0f72 deus-grok [grok] SIM.40.05 record gate output and open questions
1a7cb4c6afcaafe0de3e9c76bfc6e50003b4a56d deus-grok [grok] SIM.40.05 decay clock, parameter data and instant-keyed scheduler
3aaf7dd3a8eea5d602918d77ba5da4ec30e9ec0f deus-pm [pm] Open lane-ay (SIM.40.05): BRIEF.md and lane.json
2755f61947610723723384ad39ad3fbc92d4679f deus-gemini [pm] Retire Lane AF claim (merged after Flash CLEAN PASS)
f8632bcfcac957382867055fafff536a11a9e234 deus-gemini Merge task/lane-af: SIM.50.12 (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner DEC-034, VERDICT: CLEAN PASS at 944d3e6f4eb38ac039c94d10770f87d72a9f8799 / review 0a6c313c600a8cbeb5263ae97133ee1282934209; writer grok tip 944d3e6f4eb38ac039c94d10770f87d72a9f8799)
8ec2bd818bdcf9e251e06acb962e5e8ed3577336 deus-gemini [pm] Retire Lane AP claim (merged after Flash CLEAN PASS; Owner sign-off 2026-09-27 9:22 AM CT)
f09a1ac4980e85ab258e770ffa1686181fbd7ddb deus-gemini Merge task/lane-ap: DEUS-TSK-DEPTH-DEMO (PM merge; Gemini 3.8 Flash thinking HIGH final gate per Owner DEC-034, VERDICT: CLEAN PASS at 852357d1b7d0fd0a79161da14f2f419d8b971979 / review da0f723999f31ded4451da321857f44e08723342; writer grok tip 852357d1b7d0fd0a79161da14f2f419d8b971979; Owner sign-off 2026-09-27 9:22 AM CT)
0a6c313c600a8cbeb5263ae97133ee1282934209 deus-gemini [gemini] SIM.50.12 review 944d3e6f: VERDICT: CLEAN PASS
944d3e6f4eb38ac039c94d10770f87d72a9f8799 deus-grok [grok] SIM.50.12 note PM open files in the scope list
ec09786459bd52674060c91c404d419e19766de3 deus-grok [grok] SIM.50.12 living-world F-01..F-05 regression suite
cf7a777347e6e023bfa750450fac6b95a22ef327 deus-grok [grok] SIM.50.12 WIP: F-01..F-05 regression suite
14294bd4492cad051b368eaaa5c62a21a27aa9ee deus-gemini [pm] Register Lane AF (SIM.50.12) after launch gates met
```

---

## 2. Scope Table & Path Integrity

`git diff --name-status 2755f61947610723723384ad39ad3fbc92d4679f 2687aa1eea55a5442507d30141c155c340fb0f72`

| Status | Path | Allowed in `lane.json`? | Notes |
|---|---|---|---|
| A | `docs/systems/DEUS_Decay.md` | Yes (`docs/systems/DEUS_Decay.md`) | System documentation |
| A | `game/data/sim/decay_params.json` | Yes (`game/data/sim/decay_params.json`) | Decay parameters & classes |
| A | `game/data/sim/decay_params.schema.json` | Yes (`game/data/sim/decay_params.schema.json`) | Parameter schema |
| A | `game/js/sim/decay/clock.js` | Yes (`game/js/sim/decay/**`) | Host-agnostic decay clock |
| A | `game/js/sim/decay/core.js` | Yes (`game/js/sim/decay/**`) | Decay core, scheduler, bookings |
| A | `game/js/sim/decay/heap.js` | Yes (`game/js/sim/decay/**`) | Min-heap keyed by (dueYt, packed id) |
| A | `game/js/sim/decay/index.js` | Yes (`game/js/sim/decay/**`) | Public export surface |
| A | `game/js/sim/decay/validate.js` | Yes (`game/js/sim/decay/**`) | Dependency-free validator |
| A | `tasks/SIM.40.05/lane-ay/BRIEF.md` | Yes (`tasks/SIM.40.05/lane-ay/**`) | Lane brief |
| A | `tasks/SIM.40.05/lane-ay/REPORT.md` | Yes (`tasks/SIM.40.05/lane-ay/**`) | Writer report |
| A | `tasks/SIM.40.05/lane-ay/lane.json` | Yes (`tasks/SIM.40.05/lane-ay/**`) | Lane configuration |
| A | `tools/sim/fixtures/decay/expected_instants.json` | Yes (`tools/sim/fixtures/decay/**`) | Pinned test instants fixture |
| A | `tools/sim/test_decay_core.js` | Yes (`tools/sim/test_decay_core.js`) | Test suite |

### Non-interference checks:
- **NO ART (DEC-007):** Confirmed. No art files created, modified, or requested.
- **Sibling Lanes:** AU (Fluid/hydro), AV (Levels/WorldGen), AW (Depth overlays), AX (Wildlife), AZ (Plans), BA (Society) completely untouched.
- **Protected Files:** `game/js/sim/ledger*` untouched (read-only). `game/js/plugins.js`, `game/js/plugins/DEUS_Core.js`, `docs/STATUS.md`, `docs/OWNER_DECISIONS.md`, and all `*WBS*.md` files untouched.
- **Outside allowedPaths:** 0 files modified outside allowedPaths.

---

## 3. Gate Test Execution in Clean Temporary Clone

All gate tests were executed in a freshly cloned repository detached at `2687aa1eea55a5442507d30141c155c340fb0f72` (`.review_tmp_clone`), which was cleaned up after test completion.

### Test A: `node tools/sim/test_decay_core.js`
Raw output:
```
PASS validate_clean
PASS schema_required
PASS dpy_unset
PASS tag_OQ-R-01
PASS tag_OQ-R-04
PASS tag_OQ-R-05
PASS tag_OQ-R-09
PASS reject_zero
PASS reject_infinite_thatch
PASS reject_fraction
PASS reject_life_yt
PASS reject_unknown
PASS reject_dpy_chosen
PASS reject_ore
PASS reject_gem
PASS reject_fossil
PASS reject_roof_wall
PASS dpy_required
PASS long_life_yt
PASS r016_lives
PASS h1_lives
PASS ft8
PASS oracle_grid
PASS inverse
PASS at_r01_long_life
PASS hp_only_thresholds
PASS hp_on_cross
PASS not_every_day
PASS mutant_per_day_disagrees
PASS clock_ignores_per_day
PASS rebase_assignment
PASS rebase_moves_fail
PASS threshold_ignored
PASS h1_s1
PASS h1_s3
PASS h1_bands
PASS h1_s4
PASS not_mr16
PASS not_mr15_years
PASS day_due_differs
PASS checkpoint_year
PASS checkpoint_inclusion
PASS r016_bands
PASS h2_bands
PASS break_per_roof
PASS enqueued_cap
PASS no_deletion
PASS built_to_rubble
PASS wall_rebased
PASS member_cap
PASS mutant_world_recheck
PASS stage_no_mass
PASS mutant_mass_created
PASS mutant_stage_delta
PASS heap_order
PASS mutant_heap_order
PASS long_not_mid_day
PASS long_budget
PASS long_spread
PASS short_cap
PASS skeletal_tick_dpy1
PASS skeletal_tick_dpy20
PASS food_dpy20
PASS barrier_stops
PASS barrier_uses_cause_instant
PASS attended
PASS maintained_idle
PASS corrosion_conserves
PASS sparse_layers
PASS mutant_dense_plane
PASS r10_site
PASS r10_tick
PASS layout_no_layers
PASS residue_split
PASS rot_split
PASS save_omits_heap
PASS load_keeps_life
PASS load_does_not_rederive
PASS reload_continues
PASS heap_rebuilt
PASS mutant_lost_heap
PASS ledger_conserves
PASS ledger_refuses_coal
PASS purity
PASS special_infinite
PASS bone_gap
PASS layer_memory
decay core 87 passed, 0 failed
EXIT_CODE=0
```

### Test B: `node tools/sim/test_materials.js`
Raw output summary:
```
RESULT: 107 passed, 0 failed
EXIT_CODE=0
```

### Test C: `node tools/sim/test_ledger.js`
Raw output summary:
```
mutants: 42; run time 11242 ms
RESULT: 117 passed, 0 failed
EXIT_CODE=0
```

### Test D: `node tools/check_deus_syntax.js`
Raw output:
```
Checked 58 DEUS plugin files. Errors: 0
EXIT_CODE=0
```

---

## 4. Architectural and Scope Verification

1. **PROPOSED-R-01 (Parameter data & validator):**
   - `game/data/sim/decay_params.json` defines all 20 decay classes, 7 exposure classes, default lives in milli-years, freeze-thaw/root/fire modifiers, stage thresholds (`s1Rem`: 850000, `foundationFloorRem`: 250000), residue fractions, structure templates, and transforms.
   - All open Owner questions (`OQ-R-01`, `OQ-R-04`, `OQ-R-05`, `OQ-R-09`, `OQ-R-03`, `OQ-R-06`, `OQ-R-07`, and `D-1`) are declared as data with design defaults and explicit `ownerOpen` tags.
   - `game/js/sim/decay/validate.js` validates parameters without any external library or file I/O dependencies. It enforces structural validity, rejects invalid inputs (e.g., zero life, thatch infinity, improper life years, ore/gem/coal outputs in transforms, and inverted template roof/wall lifespans).

2. **PROPOSED-R-02 (Host-agnostic decay clock & instant-keyed scheduler):**
   - `game/js/sim/decay/clock.js` implements closed-form calculation of `lifeYt`, `remAt`, `cross`, `failYt`, rebase, damage, and repair. It is completely calendar-agnostic; `dpy` is never imported or read by `clock.js`.
   - `game/js/sim/decay/heap.js` and `core.js` implement two min-heaps (long heap for >= 1 sy members/corrosion drained at game-day boundaries with tick budget; short heap for remains/food drained each tick up to cap 16).
   - Instants are keyed by simulated year-ticks (`dueYt`). Calendar conversions (`dueYt * dpy`) occur strictly upon draining. Identical failure instants are verified at `dpy = 1, 4, 20, 360`.

3. **Collapse Hand-off & Ledger Booking:**
   - Collapse break events yield `call: "collapse.breakElement"` with `cause: "collapse.decay"`. The core stops at the barrier until the caller commits and rebases exposed structural elements.
   - Core mass balance is strictly invariant: sum of holdings plus sinks minus sources equals opened mass (`grand() === opened`). Source bookings (mass creation) are rejected (`E_MASS`).
   - `postLedger` bridges to the public `ledger.js` API (`transform`, `sink`) and rejects ore/coal/gem outputs (`E_ORE`).

4. **Sparse Storage & Memory Bounds:**
   - Memory consumption scales strictly with active decaying members, not world size or layer depth (`memoryBytes` verified identical across z=-3 and z=-12).
   - `scenarioSite()` yields 44,496 bytes (within R-10.2).
   - `scenarioL()` yields 10.8 MB for 150k members, 9 events/tick at dpy=1, 1 event/tick at dpy=20 (within R-10.4).

5. **Mutant Coverage:**
   - Tested and verified killed mutants: per-day rounding mutant (`mutant_per_day_disagrees`), wrong heap ordering (`mutant_heap_order`), schema violations (`reject_*`), stage mass creation (`mutant_mass_created`, `mutant_stage_delta`), lost heap rebuild on deserialization (`mutant_lost_heap`), world recheck overflow (`mutant_world_recheck`), dense plane layer scaling (`mutant_dense_plane`).

6. **Open Owner Questions & Follow-ups:**
   - Grok listed all Owner questions (`D-1`, `OQ-R-01` through `OQ-R-09`) with their design defaults and notes, without attempting to answer them.
   - Proposed follow-ups are correctly assigned `PROPOSED-AY-01` through `PROPOSED-AY-06`.

---

## 5. Findings

- **BLOCKER:** None.
- **MAJOR:** None.
- **MINOR:** None.

---

## 6. Verdict

VERDICT: CLEAN PASS
