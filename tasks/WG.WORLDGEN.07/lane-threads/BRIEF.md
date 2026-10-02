# WG.WORLDGEN.07: Multithreaded Offloading
**Goal:** Implement Web Workers and SharedArrayBuffer to generate chunks asynchronously, preventing main-thread stutters.
**Requirements:**
1. Create game/js/sim/worldgen/worker.js that listens for messages containing a SharedArrayBuffer and gx/gy coordinates.
2. It should run the chunk generation logic (calling into Biomes, Hydrology, etc) and write directly into the SharedArrayBuffer.
3. In DEUS_World.js uildArea, if SharedArrayBuffer is available, delegate the build to the worker pool.
4. Pass tests in 	ools/test_worldgen.js.
