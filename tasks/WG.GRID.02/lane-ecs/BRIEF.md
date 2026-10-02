# WG.GRID.02: The ECS Tick Refactor
**Goal:** Refactor DEUS_Colonists.js and DEUS_Wildlife.js to process loop updates via flat arrays rather than iterating over object arrays, matching Factorio's ECS tick.

**Requirements:**
1. Migrate HP, hunger, and stance states into typed arrays (Float32Array or Int32Array).
2. Update the main ticking loops to iterate linearly over the arrays.
3. Ensure no regression in AI logic.
