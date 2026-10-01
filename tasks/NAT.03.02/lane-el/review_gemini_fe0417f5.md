# NAT.03.02 Lane EL: Independent Review of fe0417f5 (Gemini Review)

- **Reviewer**: gemini
- **Writer**: claude
- **Date**: 2026-10-01
- **Reviewed tip SHA**: `fe0417f5d0285a7ade3fb1f0b508b2ee4ce84ece`
- **Branch**: `task/lane-el`
- **Base Commit**: `516787d559868ddaf7cb7e69f104d49a7852a36b`
- **Manifest**: `tasks/NAT.03.02/lane-el/lane.json`
- **Compliance**: Zero art generated, requested, or integrated (DEC-007). Zero modifications to engine core or unapproved paths.

---

## 1. Tip Confirmation

```text
$ git rev-parse HEAD origin/task/lane-el
fe0417f5d0285a7ade3fb1f0b508b2ee4ce84ece
fe0417f5d0285a7ade3fb1f0b508b2ee4ce84ece
```

Reviewed tip commit `fe0417f5d0285a7ade3fb1f0b508b2ee4ce84ece`: `[claude] NAT.03.02 lane-el evidence and report (code at 941b2052)`.

---

## 2. Scope Verification

`git diff --name-status 516787d559868ddaf7cb7e69f104d49a7852a36b fe0417f5d0285a7ade3fb1f0b508b2ee4ce84ece`

| Status | Path | Matching allowedPaths Pattern | Within Scope |
|---|---|---|---|
| M | `docs/systems/DEUS_NaturalConnections.md` | `docs/systems/DEUS_NaturalConnections.md` | YES |
| M | `game/js/plugins/DEUS_NaturalConnections.js` | `game/js/plugins/DEUS_NaturalConnections.js` | YES |
| A | `tasks/NAT.03.02/lane-el/REPORT.md` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/base_amended_run.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_base_natural_connections_seed20260919.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_base_seed7/results.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_tip_mutants_seed7.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_tip_natural_connections_seed20260919.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_tip_seed7/natural_connections.entrance_wetted.png` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_tip_seed7/natural_connections.ground_entrance.png` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_tip_seed7/natural_connections.landing_dry_after_wetting.png` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_tip_seed7/natural_connections.middle_entrance.png` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_tip_seed7/natural_connections.passage_order_paused.png` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/f5_tip_seed7/results.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/tip_fixture_suite.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/tip_gate_fresh_clone.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/tip_mutants.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/evidence/tip_run.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| A | `tasks/NAT.03.02/lane-el/launches/20261001_034319_prompt.txt` | `tasks/NAT.03.02/lane-el/**` | YES |
| M | `tools/test_natural_connections.js` | `tools/test_natural_connections.js` | YES |
| A | `tools/test_natural_connections_no_mint.js` | `tools/test_natural_connections_no_mint.js` | YES |

All files are strictly within `allowedPaths`. No engine core files (`rmmz_*.js`, `main.js`, `libs/`) were touched.

---

## 3. Gate Tests Verification

Executed independently in the live worktree at writer tip `fe0417f5`:

| Command | Result | Exit Code |
|---|---|---|
| `node tools/test_natural_connections_no_mint.js` | 7 passed, 0 failed | 0 |
| `node tools/test_natural_connections.js` | 24 passed, 0 failed | 0 |
| `node tools/check_deus_syntax.js` | Checked 62 DEUS plugin files. Errors: 0 | 0 |

Also verified in a fresh isolated clone (`tasks/NAT.03.02/lane-el/evidence/tip_gate_fresh_clone.txt`) with identical clean exits.

---

## 4. Substantive & Invariant Verification

1. **Option 1 Compliance (PM Ruling, DEC-058 / BRIEF_AMENDMENT_1.md)**:
   - Natural connections do not act as drains. Water crosses levels strictly through `UF.Fluid`'s own physics faces.
   - `authoritative_flow_conserved`: 27/27 floored passages show upper debit 0, lower credit 0, while the open-column control pour confirms upper debit 6 = lower credit 6.
   - `floored_passage_is_not_a_drain`: verified across seed 20260919 (27 links) and seed 7 (28 links); landing stays 0, upper level total stays 6.
2. **Private Water Store Retired**:
   - `fluidsState`, `hasFluid`, `addFluid`, `clearFluids`, `updateFluids`, and the `Levels.waterAt` wrapper are completely removed from `game/js/plugins/DEUS_NaturalConnections.js`.
   - `isWater` queries only `Levels.waterAt` and `Jobs.isWaterAt`; `dry()` delegates to `isWater`.
   - Frame-30 tick retains `stepCreatures()` while retiring `updateFluids()`.
3. **Inert Legacy Payload Round-Trip**:
   - `legacy_payload_round_trip` confirms any legacy `ufWorld.naturalConnections.fluids` structure persists through load/save cycles unmodified without being credited or queried as water.
4. **Mutant Proofs (5 Mutants Killed)**:
   - `disable_all_flow` -> `authoritative_flow_conserved` FAILS (exit 1)
   - `fake_passage_flow` -> `floored_passage_is_not_a_drain` FAILS (exit 1)
   - `credit_legacy_payload` -> `legacy_payload_round_trip` FAILS (exit 1)
   - `drop_legacy_payload` -> `legacy_payload_round_trip` FAILS (exit 1)
   - `drop_step_creatures` -> `creatures_still_stepped` FAILS (exit 1)
5. **In-Engine F5 Verification**:
   - Both rewritten liquid checks pass on seed 7: `liquid_present_at_entrance` and `liquid_flow_through_connection`.
   - Debits/credits: Ground debit 0, lower-level credit 0; landing remains `{isWater: false, depth: 0}` after 400 Fluid steps and after waiting 61 frames across two frame-30 ticks.
   - Screenshots visually verified: `landing_dry_after_wetting.png` (Z=-1 landing dry, no water) and `entrance_wetted.png` (Ground entrance).
   - In-engine mutants `mint_into_fluid` and `isWater_ignores_levels` confirmed to turn checks red (exit 1).

---

## 5. Findings

### BLOCKER
None.

### MAJOR
None.

### MINOR
1. Pre-existing in-engine suite anomalies (early return on seed 20260919 due to cave flood fills, and 4 pre-existing failures on seed 7) are documented thoroughly in `REPORT.md` and out of scope for this lane.
2. Lane merge depends on PM-side ratification of ADR-003 amendment A11 per brief precondition.

---

## 6. Verdict

VERDICT: CLEAN PASS
