# WG.GEO.01: Vertical Geology, Seams, and Spawning
1. **Z-Level Geology:** Modify WorldGen to carve caves and generate mineral/ore veins on Z < 0. Ensure perfect chunk stitching at seams.
2. **Rule-Driven Spawning & Persistence:** Hook into World Map chunk loads. Spawn creatures based on chunk biome/danger tier into UF.ECS. Ensure tamed/named creatures are preserved across save/load bounds.
