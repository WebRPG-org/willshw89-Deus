# NAT.03.01 — Lean Aquifer Kernel Preflight Specification

- **Task ID**: `NAT.03.01`
- **Milestone**: Milestone 1 (Physical Substrate & Spatial Laws)
- **Status**: ARCHITECTURAL PREFLIGHT (Implementation strictly frozen until Owner authorization)
- **Authority**: DEC-037 (Natural World Only), Owner Operating Brief 2026-09-28
- **Upstream Dependencies**: `WG.00.41` (32-Z Spatial Substrate), `NAT.02.01` (Matter Support & Excavation)

---

## 1. WHY THE PLAYER CARES

> Digging into wet sandstone can flood a mine or establish a permanent well, while digging the same depth into impermeable granite produces a dry, stable shaft. Water does not appear magically from invisible spawners; it flows from real, drainable subterranean aquifers governed by physical pressure.

---

## 2. GAME TRANSLATION

```text
GAME TRANSLATION

Player / World Effect:
When the player excavates downward and breaches a water-bearing geological stratum (e.g. sandstone or gravel aquifer), groundwater physically seeps into the breach, seeking pressure equilibrium. Saturated rock supplies water to dug wells, while over-pumping or extended drainage depletes the local water table.

Trigger:
Excavation (applyVolumeDamage), well digging, or natural sinkhole formation that voids a cell adjacent to a saturated aquifer stratum.

Runtime Authority:
game/js/sim/hydrology/aquifer.js (Hydrology State Authority) + game/js/sim/mass/ledger.js (Mass Conservation).

Simulation Path:
evalStrataSaturation(area, x, y, z) -> calcDarcySeepage(sourceCell, voidCell, dt) -> transferWaterMass() -> UF.Fluid.depositWater(area, x, y, z, mass).

Engine Bridge:
DEUS_Fluid.js receives deposited water mass, converts mass into surface/subterranean liquid fluid depth, and triggers RMMZ autotile fluid animation / passability updates.

Visible Result:
Water begins weeping from the breached rock wall, pooling on the floor of the excavation. As the water level rises, tiles transition to shallow water, then deep water. If the player builds a well over the aquifer, drawing water lowers the regional head over time.

Persistence:
Aquifer saturation levels and hydrostatic pressure heads serialize into st.hydrology.aquifers; surface/excavated fluid volume serializes into st.fluid. Exactly conserved in Mass Ledger.

Failure Without This Lane:
Subterranean mining is completely detached from geology: either digging produces zero water anywhere, or water tiles must be hardcoded as decorative static tiles. Wells cannot function based on real groundwater, and mines cannot suffer authentic, preventable flooding.

Automated Proof:
tools/test_aquifer_seepage.js: Verifies Darcy flux rates, head equilibrium, drawdown under continuous drainage, and 100% mass conservation between rock saturation and open fluid volume.

In-Game Proof:
Load known-seed mountainous area; locate sandstone aquifer layer at Z=-3; excavate a 3x3 shaft from surface Z=0 down through Z=-3; observe shaft begin filling with water only after breaching Z=-3; measure water rise until hydrostatic head matches water table; install pump and verify aquifer drawdown.
```

---

## 3. Game Bridge Status

```text
Simulation implemented: NO (Design Preflight Only; implementation locked)
Engine bridge implemented: NO (Pending simulation implementation)
Presentation implemented: YES (DEUS_Fluid / RMMZ A1 autotiles exist)
Input/player interaction implemented: NO (Pending mining/well interaction hooks)
Save/load implemented: NO (Schema defined below)
Playable verification performed: NO
```

---

## 4. Architecture & Physical Laws

### 4.1 Porous Media Storage
Each geological cell $(x, y, z)$ within the 32-layer substrate has a defined porosity $\phi$ and permeability $K$ determined by its stratum material:
- **Sandstone**: $\phi = 0.25$, $K = 1.0 \times 10^{-4}\text{ m/s}$ (High capacity, steady seepage)
- **Gravel / Alluvium**: $\phi = 0.35$, $K = 5.0 \times 10^{-3}\text{ m/s}$ (Fast yield, rapid flooding)
- **Limestone / Karst**: $\phi = 0.10$, $K = 1.0 \times 10^{-5}\text{ m/s}$ (Variable, fissure conduits)
- **Granite / Basalt**: $\phi = 0.01$, $K = 1.0 \times 10^{-9}\text{ m/s}$ (Impermeable aquitard)

### 4.2 Darcy Seepage Schedule
Seepage from an aquifer cell into an adjacent open void cell is governed by 1D Darcy flux:
$$q = -K \cdot \frac{\Delta h}{L}$$
Where:
- $\Delta h = h_{\text{aquifer}} - h_{\text{void}}$ is the hydraulic head difference.
- $L = 1\text{ cell width (48 px / 1 meter)}$.
- Volumetric transfer $\Delta V = q \cdot A \cdot \Delta t$.

### 4.3 Mass Ledger Bridge (`SIM.50.02`)
Every gallon of water ($8.34\text{ lbs}$) transferred from aquifer saturation to fluid volume is debited from `aquifer_groundwater` and credited to `surface_liquid_water` in `game/js/sim/mass/ledger.js`. Mass cannot be destroyed or minted from void.

