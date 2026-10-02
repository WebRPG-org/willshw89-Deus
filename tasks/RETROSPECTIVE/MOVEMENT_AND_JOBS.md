# Core Optimization Review: Pathfinding and AI Jobs (DEC-092)

## 1. Pathfinding (DEUS_World.js)
**Deep Research Finding:** The engine already implements elite-tier RimWorld/Factorio pathfinding!
- **Zero-Allocation A* (Structure of Arrays):** Instead of DEUS_Movement8D.js (which is just a 200-iteration fallback), the actual colony pathfinding in DEUS_World.js uses pre-allocated Int32Array and Float64Array memory banks. It never allocates JS objects during path generation.
- **Region Connectivity Cache:** Just like Dwarf Fortress, DEUS implements a Flood-Fill Region mapper (egionsOf). It assigns integer IDs to contiguous spaces. If a colonist is in Region 4 and a rock is in Region 7, the engine instantly skips pathfinding because they are mathematically unreachable.

## 2. Job Engine Allocations (DEUS_Jobs.js)
While the job engine correctly uses the "Inverted Bid" system (where idle colonists pull jobs from a queue rather than jobs scanning colonists), we found two minor string/array GC leaks:
- **Flaw 1:** st.list.slice() is called every frame to avoid mutation errors during iteration, creating throwaway arrays.
  - **Fix:** Replace with a double-buffered queue or iterate backwards or(let i = list.length-1; i>=0; i--).
- **Flaw 2:** ReservationManager._key allocates spatial string keys (cell:x,y,z) to lock tiles.
  - **Fix:** Pack the coordinates into a 64-bit integer index (or 31-bit SMI) to completely eliminate string churn in the V8 garbage collector.
