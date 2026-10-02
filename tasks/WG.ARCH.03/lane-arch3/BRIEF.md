# WG.ARCH.03: Transient Object Pooling
Pathfinding A* nodes trigger V8 GC sweeps, causing 16ms stutter spikes.
Refactor game/js/plugins/DEUS_Movement8D.js so that the A* OpenSet and Node structures are pooled. No new Node() allowed inside the hot loop.
