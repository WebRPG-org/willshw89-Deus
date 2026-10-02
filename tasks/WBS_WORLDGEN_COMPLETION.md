# ?? PROJECT DEUS: WORLDGEN COMPLETION WBS
*The final sprint to achieve RimWorld-tier performance, eliminate all JS Object memory allocation, and perfectly integrate the CDDA/Veloren/Factorio generation mechanics.*

## PHASE 1: The SoA Grid Migration
**WG.GRID.01: Structural Memory Consolidation (Worker: Grok)**
* **Target:** DEUS_Doors.js, DEUS_Walls.js, DEUS_World.js
* **Objective:** Rip out UF.World.state.doors and state.walls (which allocate thousands of V8 JS Objects for HP and timers). Replace them with flat parallel Uint16Array grids (doorHpArray, doorTimerArray) tied to the 1D index (y * width + x). 

**WG.GRID.02: The ECS Tick Refactor (Worker: Codex)**
* **Target:** DEUS_Colonists.js, DEUS_Wildlife.js, DEUS_Combat.js
* **Objective:** Abolish object-oriented iterating (or const pawn of colonists { pawn.tick() }). Implement a strict Entity-Component-System (ECS) loop where system arrays are processed linearly.

## PHASE 2: WorldGen Final Integration
**WG.WORLDGEN.06: The Engine Bridge (Worker: Claude)**
* **Target:** DEUS_WorldGen.js, DEUS_Biomes.js, DEUS_Hydrology.js
* **Objective:** Rip out the old sine-wave rivers and hard-chunk biomes. Wire the engine to natively call the Macro-A* River planner at world start, and the Micro-Tile Perturbation during chunk load.

**WG.WORLDGEN.07: Multithreaded Offloading (Worker: Antigravity/PM)**
* **Target:** package.json, DEUS_Core.js
* **Objective:** Enable SharedArrayBuffer. Spin up 4 persistent Web Workers. The chunk generation algorithms (which now exclusively output flat Uint16Arrays) are offloaded to these workers and passed to the main rendering thread with zero lock-contention or JSON serialization.

## SWARM EXECUTION PLAN
I am generating the formal BRIEF.md and lane.json manifests for **WG.GRID.01**, **WG.GRID.02**, and **WG.WORLDGEN.06** right now. I will immediately launch Grok, Codex, and Claude in parallel to execute them.
