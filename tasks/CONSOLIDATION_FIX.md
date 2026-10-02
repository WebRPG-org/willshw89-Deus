# Consolidation Fixes Required for SoA and ECS Refactors

The two Astra subagents executing WG.GRID.01 and WG.GRID.02 completed the typed array conversions but failed to account for RPG Maker MZ's JsonEx save/load process.

When you create a Uint16Array(65536) and pass it into JsonEx (which uses JSON.stringify under the hood), the entire Typed Array is expanded into a 65536-key javascript dictionary {"0":0, "1":0...}. This bloats the save file by megabytes and destroys the cache-locality of the array upon loading since it deserializes as a plain object!

## Solution
Before DataManager.saveGame executes, all typed arrays inside World.state.gridData and window.UF.ECS must be serialized to standard Arrays via Array.from(). The native LZString compression handles identical zeroes perfectly.
After DataManager.loadGame executes, those objects must be re-instantiated back into their native Float32Array or Uint16Array forms!