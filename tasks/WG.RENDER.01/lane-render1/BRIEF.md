# WG.RENDER.01: Lightmap FBO & Day/Night LUT
Create game/js/plugins/DEUS_Lighting.js. Allocate a PIXI.RenderTexture at 1/4 screen resolution. Render additive light quads into it. Implement the Day/Night 1D LUT lookup. Hook it into the Spriteset_Map composite filter.
