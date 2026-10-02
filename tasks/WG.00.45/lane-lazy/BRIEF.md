# WG.00.45: Lazy Area Generation
**Goal:** Implement the Chunk State Machine (Empty -> Terrain Generated -> Populated) to prevent chunk boundary cascades.
**Requirements:**
1. In game/js/plugins/DEUS_World.js and game/js/plugins/DEUS_WorldGen.js, track chunkState via a Uint8Array.
2. Do not instantiate flora/fauna (Populated state) until all adjacent 8 chunks are at least Terrain Generated.
