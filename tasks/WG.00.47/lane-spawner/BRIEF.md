# WG.00.47: Deterministic Runtime Spawner
**Goal:** Implement the Minecraft-style stateless spawner.
**Requirements:**
1. Modify game/js/plugins/DEUS_Wildlife.js to purely calculate spawns based on (gx, gy, time) without tracking breeding objects.
2. Ensure spawns are immediately discarded if localCapScale (1.5) is reached.
