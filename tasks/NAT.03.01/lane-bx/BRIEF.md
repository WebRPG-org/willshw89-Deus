# BRIEF: NAT.03.01 — Lean Aquifer & Water Table Kernel

## 1. Objective & Authority
- **WBS ID**: `NAT.03.01`
- **Milestone**: Milestone 1 / Package 3 — Water & Hydrology
- **Authority**: Owner Ruling `DEC-038` (Amended & Ratified: Lean Natural World v1 Foundations & Mathematical Calibration)
- **Lane**: `lane-bx`
- **Writer**: `minimax` (MiniMax M3 via Cline execution surface)
- **Reviewer**: `grok` (Independent Reviewer)

---

## 2. Context & Authoritative Subsystems
- `game/js/plugins/DEUS_Levels.js`: 32-Z coordinate substrate ($Z \in [-16 \dots +15]$), 5 discrete 2-ft strata per 10-ft Z cell ($s \in [0..4]$).
  - Depth bands: Deep Earth $[-16 \dots -11]$, Caverns $[-10 \dots -5]$, Lowlands $[-4 \dots +1]$, Uplands $[+2 \dots +6]$, Highlands $[+7 \dots +11]$, Sky $[+12 \dots +15]$.
- `game/js/sim/materials.js`: Material definitions (density, porosity, permeability).
- `game/js/sim/ledger.js`: Authoritative mass balance ledger. Mass transferred from rock groundwater into surface/excavated liquid water must be strictly conserved.
- `game/js/plugins/DEUS_Fluid.js`: Open liquid fluid dynamics and RMMZ tile presentation.

---

## 3. Scope & Requirements (Governed by DEC-038 Ratified)

### 3.1 Stratum-Level Authority (2-ft vertical strata)
- Groundwater state operates at `(x, y, z, stratum)` for $s \in [0..4]$ within each 10-ft Z cell.
- Volume: $5\text{ ft} \times 5\text{ ft} \times 2\text{ ft} = 50\text{ cu ft}$ per stratum cell.
- Material properties vary per stratum (e.g. porous sandstone vs impermeable shale).
- Each stratum cell tracks:
  - Effective porosity $\phi$: integer basis points ($0 \dots 10000$, where $10000 = 100.00\%$).
  - Hydraulic conductivity $K$: integer fixed-point scale ($0 \dots 1,000,000$).
    - $0 = \text{impermeable}$ (granite, dense shale).
    - $100,000 = \text{sandstone}$ (reference porous rock).
    - $500,000 = \text{gravel / alluvium}$ (high yield).
    - $1,000,000 = \text{reference maximum conductivity}$.
  - Saturation $S$: integer basis points ($0 \dots 10000$).
  - Total hydraulic head $h$: integer millistrata ($1000\text{ units} = 1\text{ stratum} = 2\text{ ft}$).

### 3.2 Global Elevation Datum & Hydraulic Head
- Hydraulic head is anchored to a global bedrock elevation datum ($Z=-16, s=0$ is datum 0):
  $$\text{elevationHead}(z, s) = ((z - (-16)) \times 5 + s) \times 1000 \text{ millistrata}$$
- Total head:
  $$h_{\text{total}} = \text{elevationHead} + \text{pressureHead}$$

### 3.3 Interface Conductivity & Darcy Flux
- Flux across cell interfaces uses the **harmonic mean** of neighboring permeabilities:
  $$K_{\text{interface}} = \begin{cases} 0 & \text{if } K_A = 0 \text{ or } K_B = 0 \\ \left\lfloor \frac{2 \cdot K_A \cdot K_B}{K_A + K_B} \right\rfloor & \text{otherwise} \end{cases}$$
- Seepage into an adjacent void/breached cell follows gradient:
  $$Q \propto K_{\text{interface}} \cdot \frac{h_A - h_B}{\text{distance}}$$

### 3.4 Canonical Undirected Edge & Signed Residual Tracking
- Residual transfer flow must be tracked on **canonical undirected interfaces** (`residual[edgeKey]` where `edgeKey = canonical(min(A,B), max(A,B))`):
  $$\text{grossSignedFlow} = \text{calculatedSignedFlow}_{A \to B} + \text{residual}[\text{edgeKey}]$$
  $$\text{integerFlow} = \text{truncTowardZero}(\text{grossSignedFlow})$$
  $$\text{residual}[\text{edgeKey}] = \text{grossSignedFlow} - \text{integerFlow}$$
  - Positive flow follows the canonical $A \to B$ direction; negative flow reverses it ($B \to A$ with magnitude $|\text{integerFlow}|$).
  - Flow reversal naturally cancels prior fractional residual instead of leaving stale directional debt or neighbor-order bias.

### 3.5 General Receiver-Side Clamping Invariant
- Every flow transfer step must clamp against both donor availability and receiver capacity:
  $$|\text{transfer}| \le \text{donor.availableWater}$$
  $$|\text{transfer}| \le \text{receiver.availableFluidCapacity}$$
- `availableFluidCapacity` must resolve according to receiver type:
  - **Porous geological stratum**: available pore-water capacity ($\text{maxPoreVolume} - \text{currentWater}$).
  - **Open cavern / void**: available free-fluid volume capacity.
  - **Open / surface fluid cell**: capacity defined by the existing fluid authority (`DEUS_Fluid`).
- Do not treat every receiver as porous media.
- **Invariant**: Strictly eliminates negative water, oversaturation past 10,000 basis points, and phantom mass.

### 3.6 Event-Driven & Dirty-Region Cadence
- Zero global per-tick full-world loops.
- Resting subterranean aquifers in undisturbed rock are quiescent (static).
- Breaches (excavations, collapse voids) mark adjacent aquifer cells as dirty.
- Only dirty regions update during low-frequency hydraulic equilibration cycles until steady state is reached.

### 3.7 Mass Balance & Conservation
- Water mass seeping into a breach decrements rock saturation and credits fluid volume in `game/js/sim/ledger.js`.
- Authoritative mass unit: **integer centipounds** ($1\text{ unit} = 0.01\text{ lb}$). Net mass is 100% conserved.

### 3.8 Strict Non-Goals / Exclusions
- Excludes wells, pumps, irrigation, mining jobs, or civic attachments.

### 3.9 Required Test Attack Vectors (`tools/test_aquifer_seepage.js`)
The test suite must explicitly attack and verify the 12 simulation contracts:
1. `test_stratum_storage_and_porosity`: Saturated strata storage at 2-ft stratum level (basis points 0..10000).
2. `test_darcy_cavern_breach`: Breaching adjacent cavern/void triggers Darcy seepage using harmonic mean conductivity.
3. `test_impermeable_barrier`: Impermeable strata (K=0, granite/shale) completely prevents seepage.
4. `test_aquifer_drawdown_equilibrium`: Continuous drainage depletes local head until hydrostatic equilibrium.
5. `test_sub_unit_seepage_accumulation`: Fractional flows below 1 centipound accumulate on canonical edge residual across ticks without rounding loss.
6. `test_flow_reversal_residual_cancellation`: Head reversal (hB > hA) naturally cancels previous residual debt on canonical undirected edge without directional bias.
7. `test_processing_order_invariance`: Shuffling neighbor evaluation order produces bit-identical hydraulic state and residual distribution.
8. `test_donor_exhaustion_clamp`: Flow strictly clamps to donor.availableWater, preventing negative saturation.
9. `test_receiver_capacity_clamp`: Flow strictly clamps to receiver.availableFluidCapacity (pore capacity for rock, open volume for void).
10. `test_mass_ledger_conservation`: All transferred water mass debits rock groundwater and credits open fluid in ledger.js with 100% centipound conservation.
11. `test_save_load_persistence`: Hydrology state serializes and deserializes preserving exact saturation, head, residuals, and mass balance.
12. `test_dirty_region_quiescence`: Undisturbed cells do not tick; only dirty regions update, returning to sleep at equilibrium.

### 3.10 Negative Control Mutants (Rule 4)
- `infinite_water`: Disables aquifer drawdown; tests fail.
- `leak_free`: Sets permeability to zero; seepage tests fail.
- `no_clamp`: Donor/receiver clamping bypassed; tests fail.

---

## 4. GAME TRANSLATION

```text
GAME TRANSLATION

WBS / Lane:
NAT.03.01 / lane-bx

Approved scope / Owner authorization reference:
DEC-038 (Owner ruling 2026-09-28, Lean Natural World v1 Foundations & Mathematical Calibration, Ratified)

Writer SHA / evidence date:
83b1f2e6 / 2026-09-28

Translation Class:
B WORLD-BEHAVIOR VISIBLE (Foundational Hydrology Substrate)

Player / World Effect:
Breaching a water-bearing stratum during excavation or cave-in causes groundwater to physically seep into the void at rates determined by rock porosity and pressure head. Porous sandstone/gravel formations yield water and slowly flood shafts; impermeable granite/shale formations remain dry. Water tables drawdown under sustained drainage.

Trigger:
Cell voiding (mining, excavation, cascading structural collapse) adjacent to a saturated geological stratum cell, or regional hydrostatic pressure differential.

Runtime Authority:
game/js/sim/hydrology/aquifer.js (Strata-level Hydrology State) + game/js/sim/ledger.js (Mass Conservation Ledger).

Simulation Path:
evalStrataSaturation(x, y, z, s) -> calcDarcySeepage(neighborStencil, harmonicMeanK) -> clamp(donorAvail, receiverCap) -> transferGroundwaterMass() -> ledger.transferMass("groundwater", "liquid_water", deltaCentipounds).

Engine Bridge:
Seeped water mass registers into open fluid simulation (DEUS_Fluid.js) which triggers RMMZ A1 water autotile display and depth passability.

Visible Result:
Moisture and pooled liquid appear at the base of excavated porous rock walls. Over multiple ticks, shallow water accumulates into navigable or impassable deep water.

Persistence:
Strata saturation and head values serialize in save data under world state; exact mass balance matches ledger records across save/load.

Failure Without This Lane:
Subterranean excavations have zero interaction with groundwater: either mines never encounter water, or water must be statically painted into map files with no geological realism or drainage.

Automated Proof:
tools/test_aquifer_seepage.js: Verifies strata-level porosity/saturation, local Darcy stencil flux with harmonic mean permeability, global datum elevation head, per-interface residual accumulation, double-sided clamping, event-driven dirty-region activation, drawdown depletion, and 100% mass ledger conservation.

In-Game Proof:
Load test world; locate sandstone stratum at Z=-2; breach rock face; verify water seeps and pools into trench until head balances; verify impermeable shale stratum does not seep.

CONSUMED BY GAME SYSTEMS:
- DEUS_Fluid.js: Receives seeped water mass to simulate surface/open flow.
- Future soil/moisture system: Consumes water table depth to determine soil hydration.
- How corruption manifests: Mines flooded infinitely from thin air (spawner bug), or dry wells in marsh biomes.

GAME BRIDGE STATUS
Simulation implemented: NO (Pending implementation in lane-bx)
Engine bridge implemented: NO (Pending simulation module)
Presentation implemented: YES (DEUS_Fluid / RMMZ A1 autotiles exist)
Input/player interaction implemented: NO (Pending mining/interaction hooks)
Save/load implemented: NO (Schema defined)
Playable verification performed: NO (Pending implementation)

Remaining step before player can experience it:
Complete NAT.03.01 simulation kernel and connect mass deposit hook to DEUS_Fluid.js.
```
