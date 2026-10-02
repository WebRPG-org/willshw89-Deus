# WG.GRID.01: Structural Memory Consolidation (SoA)
**Goal:** Rip out UF.World.state.doors and state.walls (JS Objects) and replace them with flat parallel Uint16Array or Int32Array grids inside DEUS_World.js to achieve RimWorld-tier memory cache locality.

**Requirements:**
1. In DEUS_World.js, add doors: new Uint16Array(cells), walls: new Uint16Array(cells).
2. Modify DEUS_Doors.js and DEUS_Walls.js to read/write HP, ownership, and timer state purely through those arrays.
3. Eliminate all JS {} object creation for tiles.
4. Pass tests in 
ode tools/test_world.js and 
ode tools/test_doors.js (create it if missing, or update it).
