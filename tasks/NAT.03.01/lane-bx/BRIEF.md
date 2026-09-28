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

## 3. Scope & Requirements (Governed by DEC-038 Amended)

### 3.1 Stratum-Level Authority (2-ft vertical strata)
- Groundwater state operates at `(x, y, z, stratum)` for $s \in [0..4]$ within each 10-ft Z cell.
- Material properties vary per stratum (e.g. porous sandstone vs impermeable shale).
- Each stratum cell tracks:
  - Effective porosity $\phi$: integer basis points ($0 \dots 10000$).
  - Hydraulic conductivity $K$: permeability coefficient.
  - Saturation $S$: integer basis points ($0 \dots 10000$, where $10000 = 100.00\%$).
  - Total hydraulic head $h$: integer millistrata ($1000\text{ units} = 1\text{ stratum} = 2\text{ ft}$).

### 3.2 Global Elevation Datum & Hydraulic Head
- Hydraulic head is anchored to a global bedrock elevation datum ($Z=-16, s=0$ is datum 0):
  $$\text{elevationHead}(z, s) = ((z - (-16)) \times 5 + s) \times 1000 \text{ millistrata}$$
- Total head:
  $$h_{\text{total}} = \text{elevationHead} + \text{pressureHead}$$

### 3.3 Interface Conductivity & Darcy Flux
- Flux across cell interfaces uses the **harmonic mean** of neighboring permeabilities:
  $$K_{\text{interface}} = \frac{2 \cdot K_A \cdot K_B}{K_A + K_B}$$
  *(If either cell has $K=0$, $K_{\text{interface}} = 0$).*
- Seepage into an adjacent void/breached cell follows gradient:
  $$Q \propto K_{\text{interface}} \cdot \frac{h_A - h_B}{\text{distance}}$$

### 3.4 Integer Unit System & Deterministic Residual Accumulator
- Conserved mass units: **integer centipounds** ($1\text{ unit} = 0.01\text{ lb}$).
- Display volume: derived gallons ($1\text{ gal} \approx 834\text{ centipounds}$).
- Fractional transfer residuals are retained in an accumulator per cell so small flows do not round to zero indefinitely:
  $$\text{totalToTransfer} = \text{calculatedFlow} + \text{residual}$$
  $$\text{actualTransfer} = \lfloor \text{totalToTransfer} \rfloor, \quad \text{residual} = \text{totalToTransfer} - \text{actualTransfer}$$

### 3.5 Event-Driven & Dirty-Region Cadence
- Zero global per-tick full-world loops.
- Resting subterranean aquifers in undisturbed rock are quiescent (static).
- Breaches (excavations, collapse voids) mark adjacent aquifer cells as dirty.
- Only dirty regions update during low-frequency hydraulic equilibration cycles until steady state is reached.

### 3.6 Mass Balance & Conservation
- Water mass seeping into a breach decrements rock saturation and credits fluid volume in `game/js/sim/ledger.js`. Net mass is 100% conserved.

### 3.7 Strict Non-Goals / Exclusions
- Excludes wells, pumps, irrigation, mining jobs, or civic attachments.

### 3.8 Negative Control Mutants (Rule 4)
- `infinite_water`: Disables aquifer drawdown; tests fail.
- `leak_free`: Sets permeability to zero; seepage tests fail.

---

## 4. GAME TRANSLATION

```text
GAME TRANSLATION

WBS / Lane:
NAT.03.01 / lane-bx

Approved scope / Owner authorization reference:
DEC-038 (Owner ruling 2026-09-28, Lean Natural World v1 Foundations & Mathematical Calibration, Amended)

Writer SHA / evidence date:
fe9b0f9b / 2026-09-28

Translation Class:
B WORLD-BEHAVIOR VISIBLE (Foundational Hydrology Substrate)

Player / World Effect:
Breaching a water-bearing stratum during excavation or cave-in causes groundwater to physically seep into the void at rates determined by rock porosity and pressure head. Porous sandstone/gravel formations yield water and slowly flood shafts; impermeable granite/shale formations remain dry. Water tables drawdown under sustained drainage.

Trigger:
Cell voiding (mining, excavation, cascading structural collapse) adjacent to a saturated geological stratum cell, or regional hydrostatic pressure differential.

Runtime Authority:
game/js/sim/hydrology/aquifer.js (Strata-level Hydrology State) + game/js/sim/ledger.js (Mass Conservation Ledger).

Simulation Path:
evalStrataSaturation(x, y, z, s) -> calcDarcySeepage(neighborStencil, harmonicMeanK) -> transferGroundwaterMass() -> ledger.transferMass("groundwater", "liquid_water", deltaCentipounds).

Engine Bridge:
Seeped water mass registers into open fluid simulation (DEUS_Fluid.js) which triggers RMMZ A1 water autotile display and depth passability.

Visible Result:
Moisture and pooled liquid appear at the base of excavated porous rock walls. Over multiple ticks, shallow water accumulates into navigable or impassable deep water.

Persistence:
Strata saturation and head values serialize in save data under world state; exact mass balance matches ledger records across save/load.

Failure Without This Lane:
Subterranean excavations have zero interaction with groundwater: either mines never encounter water, or water must be statically painted into map files with no geological realism or drainage.

Automated Proof:
tools/test_aquifer_seepage.js: Verifies strata-level porosity/saturation, local Darcy stencil flux with harmonic mean permeability, global datum elevation head, residual accumulation, event-driven dirty-region activation, drawdown depletion, and 100% mass ledger conservation.

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
