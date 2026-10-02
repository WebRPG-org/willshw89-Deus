# DEUS Ecology, Geomorphology, and Decoration - Technical Design Document

## 1. Optimal Architectural Methods

### Multi-octave Noise vs Voronoi
For Project DEUS, which features a continuous grid of 256x256 chunks across 5 vertical Z-levels (z=-2, -1, 0, +1, +2), the optimal approach for biome and ecology distribution is **Multi-octave Simplex Noise** mapped to a Whittaker Diagram (Temperature vs. Rainfall/Moisture).
- **Algorithm:** Use a deterministic, seeded 2D Simplex noise generator (e.g., OpenSimplex2). Voronoi is computationally expensive and tends to create unnatural cell-like boundaries unless heavily perturbed. Multi-octave noise (combining frequencies at scales like 0.005 for macro biomes, 0.05 for local variation) provides organic, continuous transitions.
- **Z-Level Application:** The surface (z=0) drives the climate (Temperature, Rainfall, Drainage). The upper levels (z=+1, +2) derive their canopy distribution directly from z=0. The subterranean levels (z=-1, -2) use independent noise maps to carve cave systems and distribute underground ecosystems (e.g., fungal forests).

### Solving the Chunk Boundary Problem
To ensure continuous forests, rivers, and ecology across map seams (the 256x256 boundaries):
- **Deterministic RNG:** Use a coordinate-based hash function (e.g., `mulberry32(hash32(seed, worldX, worldY))`) for all placement logic.
- **Padding/Margin Generation:** For spacing-dependent algorithms (like Poisson-Disk Sampling), generate points for a chunk *plus a margin* equal to the maximum placement radius `R` into neighboring chunks. 
- Only keep and render points that fall strictly within the current 256x256 bounds. The deterministic seed ensures that the neighboring chunk will calculate the exact same overlapping points, eliminating visible seams or cutoff trees at the boundary.

## 2. Concrete Mathematical Densities & Ratios

### Canopy / Trees (Poisson-Disk Sampling)
Avoid pure white noise for trees, as it creates impassable clumps. Use **Poisson-Disk Sampling** to enforce a minimum distance (`R`) between trees, ensuring natural spacing and pathing.
- **Dense Forest (e.g., Boreal/Moist Broadleaf):** 
  - **Density:** 45% - 60% canopy coverage.
  - **Poisson Radius:** `R = 2.0` cells. (Ensures about 1 tree per 4 to 5 walkable tiles, leaving paths open).
- **Sparse Woodland / Savanna:**
  - **Density:** 15% - 25% canopy coverage.
  - **Poisson Radius:** `R = 3.5 to 4.0` cells.
- **Z-Level Overhang:** Trees originate on z=0, but their canopy occupies z=+1 (and z=+2 for giant trees), providing visual depth without blocking z=0 movement.

### Undergrowth & Shrubs
Shrubs and functional flora should be clustered using a secondary, high-frequency noise map (scale ~0.1), evaluated *after* tree placement.
- **Ratio:** Maintain a **1:3 or 1:4 ratio** of functional shrubs/berry bushes to trees in forested biomes.
- **Placement Logic:** Use the noise threshold to place shrubs in clearings (where noise > 0.6) and near tree trunks. They must not completely block pathing channels.

### Ornamental Scatter (Non-Blocking)
Pure random scatter looks like television static. Use clustered noise (Perlin/Simplex at medium frequency, scale ~0.05) to create distinct patches.
- **Wildflowers/Grass Tuft:** Apply an overlay to **5% - 8%** of eligible grass tiles, thresholded (e.g., `noiseValue > 0.7`).
- **Pebbles / Twigs:** Apply to **2% - 5%** of tiles, mostly near rock outcrops or sparse dirt.
- **Engine Logic:** These are purely visual elements (rendered as `under: true` objects in DEUS) and must bypass pathfinding/collision checks entirely to save CPU.

### Fauna Limits & Simulation
Project DEUS cannot simulate hundreds of animals pathing simultaneously without blowing the A* budget (1 ms average update, 4 ms per beat for AI).
- **Target Density:** Spawn **15 to 25 wild animals** per active 256x256 area. 
- **Spawning Logic:** As mandated by DEC-073, wildlife and monsters are spawned by rule when each (area, z) is built, and subsequently around the player/active settlements using density caps and distance checks. They do not arrive from map edges. 
- **Herds:** Cluster herbivores into herds of 3-5. To save CPU, only the leader uses full A* pathing; followers use simple, cheap distance-matching to follow the leader. 

## 3. Subterranean Distribution (z=-1, z=-2)

### Cave Ecosystems
Subterranean life (cave fungi, stalagmites) requires open space and moisture.
- **Algorithm:** Evaluate a 2D Simplex noise mask (`noiseValue > 0.6`) inside valid cave floor cells (carved by cellular automata or 3D worm algorithms). 
- **Distribution:** Cluster rare glowing fungi near underground aquifers or mud tiles.

### Mineral & Resource Distribution (Triangular Probability)
Resources should not be uniformly scattered. Use depth-based probability curves.
- **z=-1 (Upper Subterranean - Soil/Sedimentary):** Common ores (copper, iron, coal).
  - **Density:** Wide veins. **5-8 veins per 256x256 layer**, blob size 4-8 cells via random walk.
- **z=-2 (Deep Subterranean - Igneous/Metamorphic):** Rare resources (gold, gems, mithril, magma).
  - **Density:** Sharp, small clusters. **1-3 veins per 256x256 layer**, blob size 2-3 cells.
- This creates a vertical progression loop, rewarding players for digging deeper without forcing infinite horizontal strip-mining.

## 4. Implementation Pitfalls in Node.js / RMMZ

### 1. The V8 Garbage Collection Trap
**Pitfall:** Generating a 256x256 area means 65,536 cells per Z-level. Creating a standard JS Object for every cell/tile will cause catastrophic Garbage Collection pauses.
**Solution:** Project DEUS correctly uses `TypedArrays` (e.g., `Uint16Array` for `$dataMap.ufObjects`). Keep metadata in a flat array where the index is `(y * 256) + x`, and use sparse HashMaps only for complex, active entities.

### 2. Full-World Scans
**Pitfall:** Iterating over 65,536 cells every frame for animations, growth, or AI checks.
**Solution:** As per `ARCHITECTURE.md` Invariant 4, never do full-world scans. Use spatial registries, localized queries, dirty flags, and event-driven updates.

### 3. Pathfinding on Decoration
**Pitfall:** Treating ornamental scatter as entities that A* must evaluate.
**Solution:** Visual elements must be flagged `passable: true` and `under: true` in the catalog. The engine must bypass them instantly during pathfinding.
