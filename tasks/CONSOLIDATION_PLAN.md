# ??? The RimWorld/Factorio Consolidation Plan
*Deep research on the structural differences between DEUS's 42 fragmented plugins and the monolithic CPU-cache optimized architectures of RimWorld and Factorio.*

## 1. The Fragmentation Problem
DEUS currently has 42 active plugins (e.g., DEUS_Walls.js, DEUS_Doors.js, DEUS_Tiles.js, DEUS_Floors.js).
This is a standard RPG Maker pattern, but it is fatal for a colony sim. 
When the pathfinder needs to check if a cell is walkable, it has to jump between the DEUS_Walls memory heap, the DEUS_Doors memory heap, and the DEUS_Tiles memory heap. This causes **L1/L2 Cache Misses** on the CPU, crippling framerates at high speeds.

## 2. The RimWorld Architecture (The Map Grid)
If you decompile RimWorld's Verse.dll, you will not find a DoorGrid or a WallGrid. You will find Map.thingGrid, Map.roofGrid, and Map.terrainGrid. 
RimWorld consolidates all physical objects into a single 1D flat array: Thing[].
**Our Optimization:** We must consolidate DEUS_Tiles, DEUS_Objects, DEUS_Walls, DEUS_Doors, and DEUS_Floors into a single, unified DEUS_Grid.js. 
By doing this, the A* pathfinder only queries a single Int32Array containing the collision bitmask for everything on the cell simultaneously.

## 3. The Factorio Architecture (The Entity Lifecycle)
Factorio manages millions of entities by batching their updates by system, not by object type.
Currently, DEUS separates DEUS_Colonists, DEUS_Wildlife, DEUS_Combat, DEUS_Stance, and DEUS_Jobs. This means the engine is iterating over colonist arrays, then iterating over wildlife arrays, destroying cache locality.
**Our Optimization:** We must consolidate all living beings into a unified DEUS_Entities.js running a strict **Entity-Component-System (ECS)** loop. 
All movement is calculated in one loop. All job bidding is calculated in another. This prevents the simulation from thrashing memory.

## 4. The Presentation Layer
DEUS_Visuals, DEUS_Perspective25D, DEUS_Depth, DEUS_Camera, DEUS_Anim, DEUS_Fog. 
These plugins execute purely to render the screen. In CDDA, simulation and rendering are strictly air-gapped. 
**Our Optimization:** Merge these 6 plugins into a single DEUS_Presentation.js wrapper. This ensures that the headless simulation tests (like the ones we ran for WorldGen) never accidentally touch a Camera or Animation reference.

## Execution Timeline
I am prepared to immediately launch an automated Python/Node script to merge these JS files, strip their redundant global wrappers, and update the plugins.js payload to boot the new RimWorld-optimized Core files.
