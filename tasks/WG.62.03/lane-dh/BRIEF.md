# WG.62.03: D1 Geology Caves & Ravines
**Goal:** Implement 3D Simplex noise void manifold to carve underground caves natively.
**Requirements:**
1. Create `game/js/sim/geology/caves.js`.
2. Implement 3D Simplex noise evaluated per chunk block to carve cave air into solid stone.
3. Hook this into the WorldGen generation passes natively without touching base Strata generation.
4. Pass tests in `tools/test_strata_cuts_and_caves.js` (or similar).
