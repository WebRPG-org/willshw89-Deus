# NAT.03.02: Dynamic Hydrology Simulation
**Goal:** Finalize the macro-river A* generation to carve paths correctly.
**Requirements:**
1. Modify `game/js/sim/worldgen/DEUS_Hydrology.js`.
2. Ensure macro rivers never path uphill. Use iterative erosion algorithms so water carves canyons and eventually pools into standing lakes at local minima.
3. Pass tests in `tools/test_hydrology.js`.
