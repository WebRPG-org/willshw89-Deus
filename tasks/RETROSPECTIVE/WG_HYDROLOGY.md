# WG_HYDROLOGY: Deep Research on Procedural Generation of Rivers and Hydrology (DEC-092)

## 1. Critique of Prior Findings
The prior investigator correctly identified that DEUS currently uses simplistic vertical columns for rivers (`DEUS_WorldGen.md`, lines 24-27) and proposed a Macro/Micro generation split inspired by Dwarf Fortress. However, their technical recommendations for integrating with the engine were based on outdated or incomplete understanding of `DEUS_Levels`.

**Claim:** "Adjust the `DEUS_Levels` column invariant (line 47). Where a river cell is placed, force `surfaceElevationAt(gx, gy)` to a lowered state... setting surrounding ground to `solid` and the river itself as `open` floor."
**Evidence Cited:** `docs/systems/DEUS_WorldGen.md` line 47.
**What the code actually shows:** The prior worker failed to read `docs/systems/DEUS_Levels.md`. As of DEUS-TSK-FABLE-19A and 19B (generator 5), the world uses a **Strata** system (5 strata per cell). Shapes like `solid` and `open` are derived entirely from strata; they are not manually forced arrays anymore. `surfaceElevationAt` is an adapter that reads the top solid stratum. Natural cuts and caves are already fully supported.
**Corrected Finding:** We do not override `surfaceElevationAt` or manually paint shapes. To carve a canyon, the generator must remove solid strata (replace with `air` material) in the cells over the river, and place `water` material in the riverbed stratum. The engine will automatically derive the `open` airspace and the river `floor` with appropriate water material.

## 2. Recommended Algorithm & Implementation

### A. Macro-Level Generation (World Seed / Initialization Phase)
- **Macro Grid:** Generate a downscaled elevation and drainage map during `DEUS.World.ensureWorldLevels` or a new world-init hook.
- **Catchments and Flow (A* / Steepest Descent):** From high-elevation, high-moisture springs, trace paths downhill to local minima (lakes) or sea level (elevation 0). A* can be used to prevent local-minima trapping, heavily weighting downhill gradients.
- **Graph Storage:** Store the resulting macro-river network (segments, confluences, widths) in `DEUS.World.state.waterModel` or equivalent global state, mapping macro-edges to world coordinates.

### B. Micro-Level Generation (Chunk Build Phase)
- **Deterministic Meandering:** During `buildArea`, identify intersecting macro-river segments. Perturb the linear segment using `valueNoise(seed, river_id, gx, gy)` to create organic meandering. Since `gx` and `gy` are absolute world coordinates, the noise evaluates identically on both sides of a chunk boundary, guaranteeing seamless connection.
- **Strata Carving (Canyons):** Inside `DEUS_Levels` baseline generation (Generator 5), for each cell in the perturbed river path, overwrite the strata. Drop the solid surface down to the riverbed's target elevation (based on gradient). Fill the resulting void with `air` strata, and set the riverbed stratum to the `water` material (`id: 4`).
- **Lake Pooling:** When a river reaches a local minimum macro-node, execute a deterministic flood-fill (dilation) up to a calculated volume to form a lake, again carving strata and placing `water`.

## 3. Remaining Questions & Gaps
- **Performance of Macro-Generation:** Running an A* pathfinder across a massive global map during initialization could cause a noticeable loading stall. We need to determine the maximum viable resolution for the macro-map (e.g., 1 macro tile = 1 chunk or 4x4 chunks).
- **Strata Fluid Dynamics:** DEUS-TSK-FABLE-19A notes that fluid strata take no HP damage and run fluid hooks. We need to verify if flowing river water requires continuous fluid updates, or if static `water` strata are sufficient for rivers.
- **Chunk Boundary Carving Artifacts:** If deterministic noise pushes a riverbed sharply against a chunk boundary, the adjacent chunk must carve the canyon walls correctly. We must ensure the carving brush radius reads noise deterministically for neighboring cells so walls don't shear vertically at chunk edges.
- **Interaction with Underground Caverns:** If a river carves deeply into -1 or -2, it might intersect the generated underground cave pockets. The rules for underground waterfalls or flooding need to be defined.
