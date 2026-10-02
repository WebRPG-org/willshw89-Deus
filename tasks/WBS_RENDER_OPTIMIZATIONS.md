# WBS Phase 6: Rendering Optimizations

**Objective:** Implement the WebGL rendering techniques found by the Renderer Scout.

## Track 1: Lightmap FBO & Day/Night LUT (WG.RENDER.01)
*Implement a 1/4th resolution Lightmap Framebuffer Object.*
- **Task A:** Create game/js/plugins/DEUS_Lighting.js. Allocate a PIXI.RenderTexture at 1/4 screen resolution. Render additive light quads.
- **Task B:** Implement the Day/Night 1D LUT lookup.

## Track 2: Entity Culling and Spatial Hashing (WG.RENDER.02)
*Implement PIXI.js culling for 10,000+ entities.*
- **Task A:** Create game/js/plugins/DEUS_Culling.js. Use bit-shift integer hashing for spatial buckets. Park offscreen entities in a isible=false container.
