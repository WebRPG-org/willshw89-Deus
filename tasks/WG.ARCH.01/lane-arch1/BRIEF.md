# WG.ARCH.01: Binary Serialization & Zero-Copy Saves
RPG Maker MZ's JsonEx parser takes massive hits on memory and CPU when saving/loading massive arrays. We must bypass JSON for our structural arrays.
Implement a custom binary packing layer for all core Uint16Array grids inside game/js/plugins/DEUS_World.js.
Instead of JSON stringifying the arrays, convert them to base64 strings upon save, and parse them back to Uint16Array upon load.
