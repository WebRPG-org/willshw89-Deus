### DEUS CONCRETE TASK ASSIGNMENT
- **Task ID**: WG.BIOMES.03
- **Objective**: Implement Biome Jitter and Fractional Ecology IDW blending.
- **Active Milestone**: WorldGen
- **Authoritative Source Files**: game/js/sim/worldgen/DEUS_Biomes.js, 	ools/test_biomes.js
- **Allowed Edit Paths**: game/js/sim/worldgen/DEUS_Biomes.js, 	ools/test_biomes.js
- **Requirements**:
  1. Implement a Minecraft-style spatial Jitter function evaluating noise at gx + jitter_x(gx, gy) * 3.0.
  2. Implement an IDW weighting function to calculate the top 2 biomes for a given cell based on its continuous Temperature, Rainfall, and Drainage values.
  3. Write a headless test in 	ools/test_biomes.js that checks fractionality of a border cell.
- **Stop Boundary**: 2 failures.
