/*:
 * @target MZ
 * @plugindesc [v1.0.0] DEUS PIXI.js VRAM Asset Streaming API
 * @author Astra
 *
 * @help
 * Implements UF.Assets.backgroundLoad and UF.Assets.unload wrapping PIXI.Assets.
 */

var UF = UF || {};
UF.Assets = UF.Assets || {};

/**
 * Safely load an array of textures in the background.
 * @param {string[]} textureArray Array of texture paths or aliases.
 */
UF.Assets.backgroundLoad = async function(textureArray) {
    if (typeof PIXI === 'undefined' || !PIXI.Assets) {
        console.warn("UF.Assets: PIXI.Assets is not available.");
        return;
    }
    
    try {
        await PIXI.Assets.backgroundLoad(textureArray);
    } catch (e) {
        console.warn("UF.Assets.backgroundLoad error:", e);
    }
};

/**
 * Safely unload an array of textures to free VRAM.
 * @param {string[]} textureArray Array of texture paths or aliases.
 */
UF.Assets.unload = async function(textureArray) {
    if (typeof PIXI === 'undefined' || !PIXI.Assets) {
        return;
    }
    
    for (const tex of textureArray) {
        try {
            await PIXI.Assets.unload(tex);
        } catch (e) {
            console.warn("UF.Assets.unload error for " + tex + ":", e);
        }
    }
};
