/*:
 * @target MZ
 * @plugindesc Cellular Automata Fluid Dynamics Engine
 * @author DEUS PM
 *
 * @help DEUS_CellularFluids.js
 * Implements a low-priority engine tick that sweeps over a Uint8Array
 * water depth grid. For every tile with water > 0, it pushes water to 
 * adjacent tiles of lower elevation, supporting pooling and dams.
 */

(() => {
    window.UF = window.UF || {};
    window.UF.World = window.UF.World || { ticks: 0, state: {} };
    
    // We hook into the DEUS World simulation tick
    const _World_update = window.UF.World.update || function() {};
    window.UF.World.update = function() {
        _World_update.call(this);
        
        // Only run fluid simulation every 60 frames (1 second)
        if (window.UF.World.ticks % 60 === 0) {
            if (window.UF.Fluids && window.UF.Fluids.simulate) {
                window.UF.Fluids.simulate();
            }
        }
    };

    function simulateFluids() {
        const state = window.UF.World.state;
        if (!state || !state.waterDepth || !state.elevation) return;
        
        const width = state.width || 100;
        const height = state.height || 100;
        const water = state.waterDepth;
        const elev = state.elevation;
        
        // We need a secondary buffer to avoid directional bias during the sweep
        const nextWater = new Uint8Array(water);

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                const w = water[idx];
                
                if (w > 0) {
                    // Check neighbors
                    const neighbors = [
                        idx - width, // North
                        idx + width, // South
                        idx - 1,     // West
                        idx + 1      // East
                    ];

                    let lowestIdx = idx;
                    let lowestElev = elev[idx] + w;

                    for (const n of neighbors) {
                        // Check for dams (walls/doors)
                        if (state.walls && state.walls[n] > 0) continue;
                        if (state.doors && state.doors[n] > 0) continue;

                        const neighborElev = elev[n] + water[n];
                        if (neighborElev < lowestElev && water[n] < 7) {
                            lowestElev = neighborElev;
                            lowestIdx = n;
                        }
                    }

                    if (lowestIdx !== idx) {
                        // Move 1 unit of water
                        nextWater[idx] -= 1;
                        nextWater[lowestIdx] += 1;
                    }
                }
            }
        }
        
        // Swap buffers
        state.waterDepth.set(nextWater);
    }
    
    window.UF.Fluids = {
        simulate: simulateFluids
    };
})();
