# REPORT: NAT.03.01 — Lean Aquifer & Water Table Kernel

## 1. Overview
- **WBS ID**: `NAT.03.01`
- **Lane**: `lane-bx`
- **Writer**: MiniMax (MiniMax M3 via Cline execution surface)
- **Reviewer**: `grok`
- **Status**: IMPLEMENTATION COMPLETE & GATE PASS (12 of 12 checks pass, negative controls verified)

## 2. Changes Made
- `game/js/sim/hydrology/aquifer.js`:
  - `Stratum`: Represents discrete 2-ft strata with porosity (0..10000 bps), saturation (0..10000 bps), integer centipound water mass, global datum elevation head, pressure head, and total head.
  - `calcInterfaceConductivity()`: Computes harmonic mean permeability ($K_{\text{interface}} = \lfloor \frac{2 K_A K_B}{K_A + K_B} \rfloor$).
  - `canonicalEdgeKey()`: Generates canonical undirected interface key `min(idA, idB) + ":" + max(idA, idB)`.
  - `AquiferEngine`: Implements Darcy flow rate calculation, canonical undirected signed residual tracking, double-sided fluid capacity clamping (distinguishing porous rock vs void/cavern capacity), and dirty-region event loops with quiescent sleep.
  - `serialize()` / `deserialize()`: Complete state persistence.
- `game/js/sim/hydrology/index.js`:
  - Subsystem entry point exporting unified Hydrology/Aquifer API.
- `tools/test_aquifer_seepage.js`:
  - Complete 12-test validation suite covering all non-negotiable simulation invariants and negative control mutants.

---

## 3. GAME TRANSLATION

```text
GAME TRANSLATION

WBS / Lane: NAT.03.01 / lane-bx
Approved scope / Owner authorization reference: DEC-038 (Ratified: Foundations & Mathematical Calibration)
Writer SHA / evidence date: 2026-09-28
Translation Class: C FOUNDATIONAL / INDIRECT (Subterranean Hydrology Authority)

Player / World Effect:
Subterranean rock strata hold physical groundwater under pressure. When the player or a cave-in excavates into a water-bearing stratum, water physically seeps into the breach according to rock permeability, causing local water table drawdown and filling subterranean spaces.

Trigger:
Cell breach (excavation, cave-in void creation) or hydraulic gradient difference across permeable strata interfaces.

Runtime Authority:
Hydrology subsystem (`game/js/sim/hydrology/aquifer.js`) owns water table elevation head, saturation, and signed interface residuals. Mass is authoritatively tracked in integer centipounds.

Simulation Path:
`AquiferEngine.prototype.processTick()` -> `calcInterfaceConductivity()` -> `signedResidualMap` update -> double-sided clamp against `donor.waterMass` and `receiver.getAvailableFluidCapacity()`.

Engine Bridge:
DEFERRED TO Package 4 (Soil/Geomorphology) & Package 8 (Natural World Integrated Proof). RMMZ tile/fluid bridge will consume stratum saturation and void water mass to render seepage wetness tiles and open standing water.

Visible Result:
In this foundational phase: deterministic headless Darcy seepage, sub-unit residual accumulation without rounding debt, flow reversal cancellation, and quiescent dirty-region sleep. Direct visual presentation deferred to surface/cavern fluid rendering.

Persistence:
`AquiferEngine.prototype.serialize()` and `deserialize()` preserve exact stratum saturation, head, signed edge residuals, and mass ledger state across save/load cycles.

Failure Without This Lane:
Subterranean caverns and mines would either have no water or infinite arbitrary water; digging near an aquifer would not seep or drain; water mass would not be conserved.

Automated Proof:
Command: node tools/test_aquifer_seepage.js
Exit: 0 (12/12 passing). Mutants infinite_water, leak_free, and no_clamp all exit 1.

In-Game Proof:
NOT RUN (Foundational simulation kernel; in-engine scenario scheduled for Natural World v1 Exit Gate).

CONSUMED BY GAME SYSTEMS:
- Geomorphology/Soil (NAT.04.01): Will read stratum moisture/saturation to compute weathering and soil moisture.
- Cavern/Surface Fluid (DEUS_Fluid): Receives physical water mass seeping from breached strata.
- Gameplay consequence of corruption: Infinite flood or bone-dry world; desynchronized water mass.

GAME BRIDGE STATUS
Simulation implemented: YES - 12/12 passing contracts in test_aquifer_seepage.js
Engine bridge implemented: DEFERRED - To be bridged in Package 4 & 8
Presentation implemented: DEFERRED - To be bridged in Package 4 & 8
Input/player interaction implemented: DEFERRED - To be triggered via excavation/mining jobs
Save/load implemented: YES - Verified in test_save_load_persistence
Playable verification performed: NO - Foundational kernel; headless gate passed
```

---

## 4. Test Evidence
```text
=== NAT.03.01 Aquifer Kernel Gate Tests [BASELINE] ===
PASS: test_stratum_storage_and_porosity - maxWaterMass=78000, saturation=5000 bps, head=82500 ms
PASS: test_darcy_cavern_breach - Harmonic K=181818, transferred=36 cp into void, conserved mass=93600 cp
PASS: test_impermeable_barrier - Zero seepage across K=0 boundary, kInterface=0
PASS: test_aquifer_drawdown_equilibrium - Equilibrated in 500 ticks, totalMass=100000 cp
PASS: test_sub_unit_seepage_accumulation - Fractional residuals accumulated across ticks into exact integer transfer without truncation loss
PASS: test_flow_reversal_residual_cancellation - Signed canonical edge residual canceled forward debt upon head inversion (0.0022 -> -0.0192)
PASS: test_processing_order_invariance - Forward and reverse neighbor evaluation produced bit-identical mass: 79618, 50127, 20255 cp
PASS: test_donor_exhaustion_clamp - Zero negative water: donor clamped at exactly 0, transferred 5 cp
PASS: test_receiver_capacity_clamp - Zero oversaturation: receiver clamped to max capacity 93600 cp
PASS: test_mass_ledger_conservation - Mass before=100000 cp, after=100000 cp, diff=0 cp (100% conserved)
PASS: test_save_load_persistence - Serialized/deserialized state bit-identical, mass=90000 cp
PASS: test_dirty_region_quiescence - Sleeping update cost=2.100 μs, activeCells=0, interfacesProcessed=0

ALL CHECKS PASSED: 12 check(s) verified in 7ms.
```

### Mutants Tested (AGENTS.md Rule 4)
- `infinite_water`: Disables drawdown decrement -> Result: `FAIL: Aquifer stratum did not seep (mass=93600)` (KILLED)
- `leak_free`: Forces conductivity to zero -> Result: `FAIL: Cavern void received no seepage water (mass=0)` (KILLED)
- `no_clamp`: Bypasses donor/receiver capacity clamps -> Result: `FAIL: Donor dropped below zero: -495` (KILLED)

### Computational Complexity & Telemetry
- Active cells: 2 to 3 during dynamic equilibration; 0 during quiescent sleep.
- Interfaces processed: proportional to active dirty interfaces only (0 during sleep).
- Sleeping update cost: ~2.100 microseconds.
- Global full-world scan: NO.
