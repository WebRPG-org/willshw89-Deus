# Independent Code Review: NAT.03.01 (lane-ed)

- **Lane**: lane-ed
- **Task**: NAT.03.01
- **Reviewed Commit**: `b1edf735724f2cc3e908b005ab5f13249de5878e`
- **Reviewer**: gemini (independent cross-family reviewer for claude writer)
- **Date**: 2026-10-01

---

## 1. Scope & Manifest Compliance

The reviewed writer tip commit `b1edf735724f2cc3e908b005ab5f13249de5878e` (and the diff against lane base `24d0de803c3de9fa465b6ed038807bdfb395cf46`) modifies exactly 11 files, all strictly within `allowedPaths` in `tasks/NAT.03.01/lane-ed/lane.json`:
- `game/js/sim/hydrology/aquifer.js`
- `tasks/NAT.03.01/lane-ed/REPORT.md`
- `tasks/NAT.03.01/lane-ed/evidence/base_new_checks_fail.txt`
- `tasks/NAT.03.01/lane-ed/evidence/base_run.txt`
- `tasks/NAT.03.01/lane-ed/evidence/no_physics_change.txt`
- `tasks/NAT.03.01/lane-ed/evidence/tip_gate_fresh_clone.txt`
- `tasks/NAT.03.01/lane-ed/evidence/tip_hand_mutations.txt`
- `tasks/NAT.03.01/lane-ed/evidence/tip_mutants.txt`
- `tasks/NAT.03.01/lane-ed/evidence/tip_run.txt`
- `tasks/NAT.03.01/lane-ed/launches/20261001_050434_prompt.txt`
- `tools/test_aquifer_seepage.js`

Engine core (`game/js/rmmz_*.js`, `game/js/main.js`, `game/js/libs/`) is completely untouched.

---

## 2. Technical Evaluation

- **Aquifer Kernel (`game/js/sim/hydrology/aquifer.js`)**:
  - Constants: Lines 16-18 successfully import water density and stratum volume constants from `../units.js` (50 ft3, 6240 cp/ft3, 312000 cp/stratum). `index.js` re-exports are untouched and backward-compatible.
  - Per-Interface Budgeting: `processTick(dt, ledger, opts)` accepts `opts.maxInterfaces` to cap interface evaluations per call; the pass-start edge collection and sort stay unbudgeted (walks the dirty set). An interrupted pass maintains its iteration cursor, resuming seamlessly on subsequent ticks.
  - State Serialization: Serialized state preserves the active cursor and edge collection, supporting save/load mid-pass without state corruption. Deserialization of prior saves defaults cleanly to an empty cursor.
  - World Wrapping: `opts.wrap = { width, height }` accurately stitches toroidal boundaries at 5 ft spacing. Cells woken mid-pass across seams remain dirty.
  - Invariance: 20 random seeded configurations over 200 unbudgeted ticks demonstrated bit-identical parity between base kernel and tip kernel (the equivalence of budgeted vs unbudgeted execution is verified by `budgeted_equals_unbudgeted`, while mid-pass save/load resumption is verified by `cursor_survives_save`).

- **Gate Verification & Mutants**:
  - `node tools/check_deus_syntax.js`: PASS (0 errors).
  - `node tools/test_aquifer_seepage.js`: PASS (17/17 checks passed; all 5 new checks failed at base; `cursor_reset` mutant and 11 targeted hand mutations verified red).
  - `node tools/sim/test_units.js`: PASS (7/7 passed).

---

## 3. Conclusion & Merge Recommendation

The implementation is verified, preserves physical conservation, integrates clean budgeting and wrapping, and passes all gates.

VERDICT: CLEAN PASS
Recommended for merge via `merge_gate.js`.
