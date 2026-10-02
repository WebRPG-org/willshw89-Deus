# WG.00.41: Finalizing the Simulation Kernel
**Goal:** Optimize game/js/sim/structural/ and DEUS_Core.js to eliminate any hidden GC allocations during the tick cycle.
**Requirements:**
1. Rip out all object allocations in DEUS_Core.js update() and spatial queries.
2. Implement strict Array iteration.
3. Test with 
ode tools/test_structural_connectivity.js.
