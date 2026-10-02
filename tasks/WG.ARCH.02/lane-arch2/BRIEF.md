# WG.ARCH.02: PIXI.js VRAM Asset Streaming
Write game/js/plugins/DEUS_AssetStreaming.js wrapping PIXI.Assets.
Implement a simple API UF.Assets.backgroundLoad(textureArray) and UF.Assets.unload(textureArray) that safely loads and unloads sprites without blocking the main thread.
