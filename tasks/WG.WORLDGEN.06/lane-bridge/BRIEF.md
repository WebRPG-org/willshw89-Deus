# WG.WORLDGEN.06: The Engine Bridge
**Goal:** Wire the completed DEUS_Biomes.js and DEUS_Hydrology.js into the actual live chunk loader in DEUS_WorldGen.js.

**Requirements:**
1. Remove old sine-wave river logic from DEUS_WorldGen.js.
2. Connect DEUS_WorldGen.js to call the A* macro river planner at World Init.
3. Connect chunk generation to query the fractional IDW Biome math and Micro-River perturbations.
4. Prove it with 
ode tools/test_worldgen.js and F5 Playtest F8 console verification.
