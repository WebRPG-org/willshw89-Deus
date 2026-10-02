# WG.PHYSICS.01: Falling Cubes, Shadows, and Crushing Death
Create game/js/plugins/DEUS_StructuralPhysics.js. 
1. **Structural Integrity:** Evaluate blocks on Z > 0. If a block has no anchors (no adjacent blocks N/S/E/W/Down), it falls.
2. **Shadows:** Airborne blocks must cast a shadow onto the Z-level beneath them (using PIXI Sprite or filters).
3. **Crushing Death & Saving Throws:** When a block falls onto an entity, roll an SRD 5.1 Dexterity Saving Throw. If success, move entity to a free adjacent space. If failure or no free space, apply instant death (HP = 0) and spawn a corpse.
