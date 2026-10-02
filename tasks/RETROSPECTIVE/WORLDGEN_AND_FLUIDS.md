# WorldGen and Fluids Optimization Review (DEC-092)

## 1. Structural Hash Collisions (game/js/sim/structural/)
**Current Flaw:** Using (y << 8) | x for SMI coordinate packing. Global gx and gy can easily exceed 255. A shift of 8 bits causes x values to overflow into y, creating silent hash collisions where two distinct blocks resolve to the same coordinate.
**Fix:** V8 supports 31-bit SMIs. Use (g << 20) | (y << 10) | x to safely pack coordinates.

## 2. Fluid Dirty Queue Allocations (DEUS_Fluid.js)
**Current Flaw:** data.inQueue uses a standard JavaScript Set. In a 2 million block environment, Set creates heavy object allocations and pointer-chasing overhead. 
**Fix:** Replace inQueue with a ~256 KB flat bitset (Uint32Array or Uint8Array). This gives O(1) zero-allocation membership checking.

## 3. WorldGen Caching Memory Bloat (DEUS_WorldGen.js)
**Current Flaw:** Attempting to cache noise maps using a raw 1D array indexed by raw global coordinates (iy * 65536 + ix) creates a sparse array that can bloat up to 570 MB per salt (9 GB total RAM).
**Fix:** Stick with Map for global coordinates or implement dense chunk-relative packing indexing. Do not blindly use 1D sparse arrays for global coordinates.
