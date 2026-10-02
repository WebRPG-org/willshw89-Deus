# WorldGen Biome & Ecology Coupling (DEC-092)

## 1. The Hard-Edge Problem
**Current Flaw:** DEUS_WorldGen.js computes 5 continuous 3D noise fields (Temperature, Rainfall, Drainage, Elevation, Volcanism). However, it uses rigid if/else thresholds (e.g. if (temp < 0.4) return TUNDRA). This projects a mathematically continuous field into a hard 1-cell spatial wall. Animals programmed to stay in Grasslands hit an invisible wall where the Desert starts.

## 2. Minecraft Jitter (Visual Blending)
**The Fix:** We will eliminate hard lines by applying spatial jitter to the sampling coordinate. Instead of evaluating noise precisely at gx, gy, we evaluate it at:
X_sample = gx + noise_jitter_x(gx, gy) * 3.0
Y_sample = gy + noise_jitter_y(gx, gy) * 3.0
This creates a beautiful, dithered interlocking pattern at biome borders (identical to Minecraft's Voronoi zoom blur).

## 3. Fractional Ecology Blending (Wildlife)
**The Fix:** To allow flora and fauna to organically bleed across biome edges, cells will no longer store a single iomeId. They will store Inverse Distance Weighted (IDW) fractional coordinates of the top 2 biomes. 
The probability of a creature spawning is a dot product of its biome affinity and the cell's fractional weights:
P_spawn = (sp.biomes[B1] * c.weight[B1]) + (sp.biomes[B2] * c.weight[B2])
A forest wolf's spawn chance will slowly taper off to 0% as it walks further into the desert edge.
