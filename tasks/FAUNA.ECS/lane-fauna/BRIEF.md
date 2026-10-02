# FAUNA.ECS: Behavior Tree Migration
**Goal:** Migrate DEUS_Wildlife to the new ECS arrays.
**Requirements:**
1. Modify `game/js/plugins/DEUS_Wildlife.js`.
2. Move the complex AI behavior trees (hunting, sleeping, grazing) into flat functions that only read/write to `window.UF.ECS.stance`, `hunger`, and `hp` arrays.
3. Remove all `Object.create` or `{}` allocations in the tick loop. 
4. Pass `run_tests.bat ecology world`.
