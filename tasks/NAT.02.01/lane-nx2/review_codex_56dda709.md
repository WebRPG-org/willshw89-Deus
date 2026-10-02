# NAT.02.01 lane-nx2 independent review

**Verdict: PASS** for the lane-nx2 implementation scope under DEC-090. The manifest connectivity gate remains unavailable in this checkout; this verdict does not claim an all-green integration gate.

- Reviewer: Codex (OpenAI GPT family), independent of Grok writer
- Writer SHA reviewed: `6dc00efdb08974f344118436f5cb10d4e525c584`
- Reviewer fix SHA: `56dda709f78547a3ca326511f51d32342ff38d71`
- Review time: 2026-10-02 03:58 UTC
- Scope: `levels_reader.js`, `commit.js`, `occupants.js`, `index.js`, `test_structural_levels.js`, `test_structure_fluid.js`

## What changed

- `game/js/sim/structural/occupants.js`: resolve global stratum `g` to level `z` for structural object removal and ruin placement.
- `game/js/sim/structural/commit.js`: include the current cell in rollback after a writer throws following storage; report incomplete rollback when a restoration refuses or throws.
- `tools/test_structural_levels.js`: add regressions for both cases. The rollback regression failed before the commit fix and passed afterward.

## How I tested it

- `node tools/check_deus_syntax.js` — exit 0, 62 plugin files checked, 0 errors.
- `node tools/test_structural_levels.js` — exit 0, 69 checks including the VM scenario and 14 killed mutants.
- `node tools/test_structure_fluid.js` — exit 0, 15 checks including water and lava conservation and 3 killed mutants.
- `node tools/test_structural_levels.js --pure --no-sweep` — exit 1 with `FAIL: rollback_after_write_throws` before the commit fix; exit 0 with 42 checks afterward.
- `node tools/test_structural_connectivity.js` — exit 1 because the file does not exist in this checkout. It is outside this lane's allowed paths.
- `git diff --check` — exit 0 after fixes.

## Evidence

- Log excerpt: `PASS: rollback_after_write_throws`; `PASS: global_stratum_object_removed_to_landing`; `RESULT: PASS (69 checks)`.
- Fluid log excerpt: `PASS: slab_into_pool_conserves_water - water 7->7`; `PASS: slab_into_pool_conserves_lava - water 7->7 lava 7->7`; `RESULT: PASS (15 checks)`.
- No screenshot was produced. This is a pure simulation module and no RMMZ playtest was run.

## Not done / known problems

- The manifest's `tools/test_structural_connectivity.js` gate cannot run until its upstream file exists; lane-nx2 is not authorized to write that path.
- The structural module has no engine plugin bridge in this lane. In-game collapse, occupant damage, save/load and visible results remain for later integration; this review makes no playable claim.
- Rollback cannot guarantee restoration if the injected writer refuses or throws during restoration; `restored` now reports false in that case.

## Try it in RMMZ

1. No direct RMMZ scenario exists for this pure module. Run the two Node tests above for the lane's headless behavior.

Expected: both Node suites pass; no in-game collapse is claimed.

## Decisions needed

- The coordinator must supply or reconcile the missing connectivity gate before integration. This review does not alter the manifest.
