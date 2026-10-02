# PROJECT DEUS: WBS Phase 3 (Geology, Hydrology, Fauna ECS)
*The migration toward deep simulation logic over the newly completed SoA core.*

## PHASE 3: Simulation & Logic
**WG.62.03: D1 Geology Caves & Ravines (Worker: Grok)**
* **Target:** game/js/sim/geology/caves.js, DEUS_WorldGen.js
* **Objective:** Implement 3D Simplex noise void manifold to carve underground caves natively without disrupting base strata.

**NAT.03.02: Dynamic Hydrology Simulation (Worker: Codex)**
* **Target:** game/js/sim/worldgen/DEUS_Hydrology.js
* **Objective:** Finalize the A* river system to ensure rivers carve through mountains rather than climbing them, properly pooling into lakes.

**FAUNA.ECS: Behavior Tree Migration (Worker: Claude / Fable)**
* **Target:** game/js/plugins/DEUS_Wildlife.js, DEUS_Colonists.js
* **Objective:** Migrate the complex AI behavior trees (hunting, sleeping, grazing) into flat arrays using window.UF.ECS without allocating JS objects for path states.

## EXECUTION
Workers have been deployed across 3 isolated git worktrees.
